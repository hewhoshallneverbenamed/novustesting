"""The Sensor PDF Generator integration."""

"""The Sensor PDF Generator integration."""
import logging
import os

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
    vol.Required("input_number_entity_id"): str,
    vol.Optional("filename", default="sensor_report.pdf"): str,
})

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Sensor PDF Generator component (for YAML config or initial load)."""
    _LOGGER.debug("async_setup called for Sensor PDF Generator. Using config flow.")
    # For config flow integrations, async_setup often just returns True
    # as the main setup happens in async_setup_entry.
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Sensor PDF Generator from a config entry."""
    _LOGGER.debug("async_setup_entry called for Sensor PDF Generator.")

    # Register the PDF generation service
    # This logic is moved here from async_setup because it's tied to the config entry.
    async def handle_generate_pdf_service(call: ServiceCall) -> None:
        """Wrapper to properly handle the async service call."""
        await _async_handle_generate_pdf_service(hass, call)

    hass.services.async_register(
        DOMAIN,
        SERVICE_GENERATE_PDF,
        handle_generate_pdf_service,
        schema=SERVICE_GENERATE_PDF_SCHEMA,
    )

    _LOGGER.info("Sensor PDF Generator service registered successfully.")
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.debug("async_unload_entry called for Sensor PDF Generator.")
    # Unregister the service when the integration is unloaded
    hass.services.async_remove(DOMAIN, SERVICE_GENERATE_PDF)
    _LOGGER.info("Sensor PDF Generator service unregistered.")
    return True


async def _async_handle_generate_pdf_service(hass: HomeAssistant, call: ServiceCall) -> None:
    """Handle the generate_pdf service call."""
    input_number_entity_id = call.data.get("input_number_entity_id")
    filename = call.data.get("filename")

    _LOGGER.info(f"Attempting to generate PDF for input_number: {input_number_entity_id} into {filename}")

    # Get the state of the specified input_number entity
    input_number_state = hass.states.get(input_number_entity_id)

    if input_number_state is None:
        _LOGGER.error(f"Input number entity '{input_number_entity_id}' not found.")
        return

    try:
        # Extract the number from the input_number state
        # The state of an input_number is typically a string representation of a number
        input_number_value = float(input_number_state.state)
        _LOGGER.debug(f"Retrieved input number value: {input_number_value}")

        # Call the PDF generation function
        await hass.async_add_executor_job(
            generate_pdf_report, input_number_value, filename, hass.config.config_dir
        )
        _LOGGER.info(f"PDF '{filename}' generated successfully in Home Assistant config directory.")

    except ValueError:
        _LOGGER.error(f"Input number state '{input_number_state.state}' for '{input_number_entity_id}' is not a valid number.")
    except Exception as e:
        _LOGGER.error(f"Error generating PDF: {e}")

def generate_pdf_report(sensor_value: float, filename: str, config_dir: str) -> None:
    """Generate a PDF report with the sensor value."""
    # FPDF is already imported at the top of the file.
    from fpdf.enums import XPos, YPos
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)

    pdf.cell(200, 10, text="Sensor Report (from Input Number)", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(10) # Add some space

    pdf.cell(200, 10, text=f"The current value from input number is: {sensor_value}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="L")

    # Define the output path for the PDF
    pdf_output_path = os.path.join(config_dir, filename)
    pdf.output(pdf_output_path)
 