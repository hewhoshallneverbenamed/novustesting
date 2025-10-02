"""The Sensor PDF Generator integration."""
import calendar
import logging
import os
import pytz
import random
import string
from datetime import datetime, timedelta
from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder.history import get_significant_states
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.frontend import async_remove_panel
from homeassistant.helpers.entity_registry import async_get, async_entries_for_config_entry
from homeassistant.helpers import entity_registry as er
import arabic_reshaper
from bidi.algorithm import get_display
# import fitz  # PyMuPDF



from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.typing import ConfigType
from homeassistant.config_entries import ConfigEntry
import voluptuous as vol
from fpdf import FPDF # Import FPDF here for better clarity and to ensure it's available

_LOGGER = logging.getLogger(__name__)

DOMAIN = "sensor_pdf_generator"

# Define the service schema for generating the PDF
SERVICE_GENERATE_PDF = "generate_pdf"
SERVICE_GENERATE_PDF_SCHEMA = vol.Schema({
    vol.Required("total_energy_entity_id"): str,
    vol.Optional("filename", default="sensor_report.pdf"): str,
})

# Add this after the existing SERVICE_GENERATE_PDF_SCHEMA
SERVICE_LIST_PDFS = "list_pdfs"
SERVICE_LIST_PDFS_SCHEMA = vol.Schema({})

# Add a global cache for the timezone object
_TZ_CACHE = {}

async def get_hass_timezone(hass):
    """Get the pytz timezone object using executor job to avoid blocking."""
    tz_name = hass.config.time_zone
    if tz_name in _TZ_CACHE:
        return _TZ_CACHE[tz_name]
    tz = await hass.async_add_executor_job(pytz.timezone, tz_name)
    _TZ_CACHE[tz_name] = tz
    return tz

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration and register the custom panel."""

    _LOGGER.debug("async_setup called for Sensor PDF Generator. Using config flow.")
    # Serve static panel files (use async_register_static_paths)
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/custom_static/sensor_pdf_generator",
            hass.config.path("custom_components/sensor_pdf_generator/panel"),
            False
        )
    ])

    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Sensor PDF Generator from a config entry."""
    _LOGGER.debug("async_setup_entry called for Sensor PDF Generator.")

    # Register the PDF generation service
    async def handle_generate_pdf_service(call: ServiceCall) -> None:
        """Wrapper to properly handle the async service call."""
        await _async_handle_generate_pdf_service(hass, call)

    # Register the list PDFs service
    async def handle_list_pdfs_service(call: ServiceCall) -> dict:
        """Handle the list_pdfs service call."""
        return await _async_handle_list_pdfs_service(hass, call)

    hass.services.async_register(
        DOMAIN,
        SERVICE_GENERATE_PDF,
        handle_generate_pdf_service,
        schema=SERVICE_GENERATE_PDF_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        SERVICE_LIST_PDFS,
        handle_list_pdfs_service,
        schema=SERVICE_LIST_PDFS_SCHEMA,
        supports_response=True,
    )
    
    # Register the panel in sidebar
    if DOMAIN not in hass.data.get("frontend_panels", {}):
        try:
            async_remove_panel(hass, "pdf-panel-frontend")
        except Exception:
            pass
        
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Receipt Generator",
            sidebar_icon="mdi:file-pdf-box",
            frontend_url_path="pdf-panel-frontend",
            config={
                "_panel_custom": {
                    "name": "pdf-generator-panel",
                    "embed_iframe": False,
                    "trust_external": False,
                    "js_url": "/custom_static/sensor_pdf_generator/panel.js",
                }
            },
            require_admin=False,
        )
    # userhandler()
    _LOGGER.info("Sensor PDF Generator service registered successfully.")
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.debug("async_unload_entry called for Sensor PDF Generator.")
    # Unregister the services when the integration is unloaded
    hass.services.async_remove(DOMAIN, SERVICE_GENERATE_PDF)
    hass.services.async_remove(DOMAIN, SERVICE_LIST_PDFS)
    _LOGGER.info("Sensor PDF Generator services unregistered.")
    try:
        if hass.data.get("frontend_panels", {}).get("pdf-panel-frontend"):
            _LOGGER.info("Removing sidepanel")
            async_remove_panel(hass, "pdf-panel-frontend")
    except AttributeError:
        pass
    return True


async def _async_handle_generate_pdf_service(hass: HomeAssistant, call: ServiceCall) -> None:
    """Handle the generate_pdf service call."""
    total_energy_entity_id = call.data.get("total_energy_entity_id")
    filename = call.data.get("filename")

    _LOGGER.info(f"Attempting to generate PDF for total_energy: {total_energy_entity_id} into {filename}")

    # Get the current state of the specified total_energy entity
    total_energy_state_now = hass.states.get(total_energy_entity_id)
    if total_energy_state_now is None:
        _LOGGER.error(f"Total energy entity '{total_energy_entity_id}' not found.")
        return

    try:
        total_energy = float(total_energy_state_now.state)
        
        # Use the actual entity_id passed in instead of hardcoded one
        energy_used = await get_monthly_energy(hass, total_energy_entity_id, 2025, 8)

        # Get value from 2 days ago using the same entity
        twodaysago = datetime.now() - timedelta(minutes=2880)
        # energy_2days_ago = await get_energy_at_time(hass, "sensor.total_energy", twodaysago)
        energy_2days_ago = await get_energy_at_time(hass, total_energy_entity_id, twodaysago)
        if energy_2days_ago is None:
            energy_2days_ago = 0

        await hass.async_add_executor_job(
            generate_pdf_report,
            total_energy,
            energy_used,
            filename,
            hass.config.config_dir
        )
        _LOGGER.info(f"PDF '{filename}' generated successfully in Home Assistant config directory.")

        # Fire an event to notify the frontend panel (optional)
        hass.bus.async_fire("pdf_generator_complete", {
            "filename": filename,
            "entity_id": total_energy_entity_id,
            "success": True
        })

    except ValueError:
        _LOGGER.error("Could not convert energy values to float.")
        hass.bus.async_fire("pdf_generator_complete", {
            "filename": filename,
            "entity_id": total_energy_entity_id,
            "success": False,
            "error": "Invalid energy values"
        })
    except Exception as e:
        _LOGGER.error(f"Error generating PDF: {e}")
        hass.bus.async_fire("pdf_generator_complete", {
            "filename": filename,
            "entity_id": total_energy_entity_id,
            "success": False,
            "error": str(e)
        })

async def get_energy_at_time(hass, entity_id: str, when: datetime):
    """Return the sensor's value (as float) at the given datetime."""
    tz = await get_hass_timezone(hass)
    when = when.astimezone(tz) if when.tzinfo else tz.localize(when)
    # Use a wider window to ensure we get the last known state before 'when'
    start = (when - timedelta(days=2)).astimezone(tz)
    end = when.astimezone(tz)

    states = await get_instance(hass).async_add_executor_job(
        get_significant_states,
        hass,
        start,
        end,
        [entity_id],
    )

    entity_states = states.get(entity_id, [])
    if not entity_states:
        return None

    last_state = None
    for state in entity_states:
        state_time = state.last_updated
        if state_time.tzinfo is None:
            state_time = tz.localize(state_time)
        else:
            state_time = state_time.astimezone(tz)
        if state_time <= when:
            last_state = state
        else:
            break

    if not last_state:
        return None

    try:
        value = float(last_state.state)
        return value
    except ValueError:
        return None

async def get_monthly_energy(hass, entity_id: str, year: int, month: int):
    """Return the energy used in the given month."""
    start_of_month = datetime(year, month, 1, 0, 0, 0)
    last_day = calendar.monthrange(year, month)[1]
    end_of_month = datetime(year, month, last_day, 23, 59, 59)

    start_val = await get_energy_at_time(hass, entity_id, start_of_month)
    end_val = await get_energy_at_time(hass, entity_id, end_of_month)

    if start_val is None:
        start_val = 0

    if end_val is None:
        end_val = 0

    monthly_energy = end_val - start_val
    return monthly_energy

def generate_pdf_report(total_energy: float, energy_used: float, filename: str, config_dir: str) -> None:
    """Generate a PDF report with English section at the top and Arabic section below using Amiri-Regular.ttf for Arabic."""
    from fpdf.enums import XPos, YPos

    random_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    today = datetime.today()
    first_day_last_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    last_day_last_month = first_day_last_month.replace(day=30)
    date_range = f"{first_day_last_month.strftime('%Y-%m-%d')} to {last_day_last_month.strftime('%Y-%m-%d')}"
    counter_cost = 385000
    cost_multiplier = 32790
    total_cost = energy_used * cost_multiplier + counter_cost

    pdf = FPDF()
    pdf.add_page()

    # Use Amiri-Regular.ttf from tts folder inside config_dir
    font_path = os.path.join(config_dir, "tts", "Amiri-Regular.ttf")
    if not os.path.exists(font_path):
        raise FileNotFoundError(
            f"Amiri-Regular.ttf not found in {os.path.join(config_dir, 'tts')}. "
            "Please download Amiri-Regular.ttf from https://www.amirifont.org/ and place it in the tts folder inside your Home Assistant config directory."
        )
    pdf.add_font("Amiri", "", font_path, uni=True)
    pdf.add_font("Amiri", "B", font_path, uni=True)

    margin = 10
    page_width = pdf.w - 2 * margin
    page_height = pdf.h - 2 * margin
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(margin, margin, page_width, page_height)

    # English section
    pdf.set_xy(margin, margin + 5)
    pdf.set_font("Amiri", "B", 18)
    pdf.cell(page_width, 12, "RECEIPT", align="C", ln=1)
    pdf.set_font("Amiri", size=13)
    pdf.cell(page_width, 7, "-" * (int(page_width // 7)), align="C", ln=1)

    english_labels = [
        "Report ID:",
        "Date:",
        "Period:",
        "Total Energy (kW):",
        "Energy Used (kWh):",
        "Counter Cost:",
        "Cost per KW:",
        "Total Cost:",
    ]
    english_values = [
        random_id,
        today.strftime("%Y-%m-%d %H:%M"),
        date_range,
        f"{total_energy:.2f}",
        f"{energy_used:.2f}",
        f"{counter_cost:,}",
        f"{cost_multiplier:,}",
        f"{total_cost:,}",
    ]

    for label, value in zip(english_labels, english_values):
        pdf.set_x(margin + 5)
        pdf.cell(page_width * 0.5, 10, label, border=0)
        pdf.cell(page_width * 0.5, 10, value, border=0, ln=1)

    pdf.cell(page_width, 7, "-" * (int(page_width // 7)), align="C", ln=1)
    pdf.ln(5)

    # Arabic section (right-to-left, left margin)
    pdf.set_font("Amiri", "B", 18)
    reshaped_title = arabic_reshaper.reshape("إيصال")
    bidi_title = get_display(reshaped_title)
    pdf.cell(page_width, 12, bidi_title, align="C", ln=1)
    pdf.set_font("Amiri", size=13)
    pdf.cell(page_width, 7, "-" * (int(page_width // 7)), align="C", ln=1)

    arabic_labels = [
        "معرف التقرير",
        "التاريخ",
        "الفترة",
        "اجمالي الطاقة (ك.و)",
        "الطاقة المستخدمة (ك.و.س) ",
        " تكلفة العداد ",
        " تكلفة كل ك.و ",
        " التكلفة الإجمالية ",
    ]
    arabic_values = english_values  # same values, just different labels

    # Set X to left margin for visibility
    for label, value in zip(arabic_labels, arabic_values):
        reshaped_label = arabic_reshaper.reshape(label)
        bidi_label = get_display(reshaped_label)
        reshaped_value = arabic_reshaper.reshape(value)
        bidi_value = get_display(reshaped_value)
        pdf.set_x(margin)
        pdf.cell(page_width * 0.5, 10, bidi_value, border=0, align="R")
        pdf.cell(page_width * 0.5, 10, bidi_label, border=0, align="R", ln=1)

    pdf.cell(page_width, 7, "-" * (int(page_width // 7)), align="C", ln=1)

    # Change output directory to /config/media/receipts/
    receipts_dir = os.path.join(config_dir, "www", "receipts")
    os.makedirs(receipts_dir, exist_ok=True)
    pdf_output_path = os.path.join(receipts_dir, filename)
    pdf.output(pdf_output_path)

async def _async_handle_list_pdfs_service(hass: HomeAssistant, call: ServiceCall) -> dict:
    """Handle the list_pdfs service call."""
    try:
        receipts_dir = os.path.join(hass.config.config_dir, "www", "receipts")
        
        # Create directory if it doesn't exist (using executor)
        def ensure_directory():
            if not os.path.exists(receipts_dir):
                os.makedirs(receipts_dir, exist_ok=True)
            return os.path.exists(receipts_dir)
        
        dir_exists = await hass.async_add_executor_job(ensure_directory)
        if not dir_exists:
            return {"pdf_files": []}
        
        # List all PDF files (using executor)
        def list_pdf_files():
            pdf_files = []
            for filename in os.listdir(receipts_dir):
                if filename.lower().endswith('.pdf'):
                    pdf_files.append(filename)
            
            # Sort by modification time, newest first
            pdf_files.sort(key=lambda f: os.path.getmtime(os.path.join(receipts_dir, f)), reverse=True)
            return pdf_files
        
        pdf_files = await hass.async_add_executor_job(list_pdf_files)
        
        _LOGGER.debug(f"Found {len(pdf_files)} PDF files: {pdf_files}")
        return {"pdf_files": pdf_files}
        
    except Exception as e:
        _LOGGER.error(f"Error listing PDF files: {e}")
        return {"pdf_files": []}



