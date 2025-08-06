"""Config flow for Sensor PDF Generator integration."""
import logging

from homeassistant import config_entries
from homeassistant.core import callback

_LOGGER = logging.getLogger(__name__)

# This is the domain of your integration
DOMAIN = "sensor_pdf_generator"

class SensorPdfGeneratorConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Sensor PDF Generator."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        # This basic config flow just creates an entry without any user input.
        # It's here to satisfy the 'config_flow: true' in manifest.json.
        # In a real integration, you would prompt for user input here.

        if self._async_current_entries():
            # If an instance of this integration is already configured,
            # we don't allow another one (unless your integration supports multiple instances).
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            # If you had actual configuration options, you would process them here.
            # For this minimal example, we just create an entry.
            return self.async_create_entry(title="Sensor PDF Generator", data={})

        # Show a form, even if it's just an empty one to confirm setup.
        # For this simple case, we just create the entry directly.
        # If you wanted to show a form, you'd use:
        # return self.async_show_form(step_id="user")

        # Since this integration doesn't require specific configuration beyond the service call,
        # we can just create an empty entry directly.
        return self.async_create_entry(title="Sensor PDF Generator", data={})

    @callback
    def _async_current_entries(self):
        """Return current entries for this domain."""
        return self.hass.config_entries.async_entries(DOMAIN)

