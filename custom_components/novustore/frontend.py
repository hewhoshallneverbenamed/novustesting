"""Starting setup task: Frontend."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)

from .const import DOMAIN, URL_BASE
from .hacs_frontend import VERSION as FE_VERSION, locate_dir
from .utils.workarounds import async_register_static_path

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .base import HacsBase


async def async_register_frontend(hass: HomeAssistant, hacs: HacsBase) -> None:
    """Register the frontend."""
    hacs.log.info("="*80)
    hacs.log.info("NOVUSTORE FRONTEND REGISTRATION STARTING")
    hacs.log.info("Domain: %s", DOMAIN)
    hacs.log.info("URL_BASE: %s", URL_BASE)
    hacs.log.info("="*80)

    # Register frontend
    if hacs.configuration.dev and (frontend_path := os.getenv("HACS_FRONTEND_DIR")):
        hacs.log.warning(
            "<HacsFrontend> Frontend development mode enabled. Do not run in production!"
        )
        await async_register_static_path(
            hass, f"{URL_BASE}/frontend", f"{frontend_path}/hacs_frontend", cache_headers=False
        )
        hacs.frontend_version = "dev"
    else:
        frontend_dir = locate_dir()
        hacs.log.info("Frontend directory: %s", frontend_dir)
        hacs.log.info("Registering static path: %s/frontend -> %s", URL_BASE, frontend_dir)
        
        await async_register_static_path(
            hass, f"{URL_BASE}/frontend", frontend_dir, cache_headers=False
        )
        hacs.frontend_version = FE_VERSION
        hacs.log.info("Frontend version: %s", FE_VERSION)
        hacs.log.info("Static path registered successfully")

    # Custom iconset
    iconset_path = str(hacs.integration_dir / "iconset.js")
    hacs.log.info("Iconset path: %s", iconset_path)
    hacs.log.info("Registering iconset: %s/iconset.js", URL_BASE)
    
    await async_register_static_path(
        hass, f"{URL_BASE}/iconset.js", iconset_path
    )
    add_extra_js_url(hass, f"{URL_BASE}/iconset.js")
    hacs.log.info("Iconset registered and added to extra JS URLs")

    # Add to sidepanel if needed
    existing_panels = hass.data.get("frontend_panels", {})
    hacs.log.info("Existing frontend panels: %s", list(existing_panels.keys()))
    
    if DOMAIN not in existing_panels:
        js_url = f"{URL_BASE}/frontend/entrypoint.js?hacstag={hacs.frontend_version}"
        panel_config = {
            "_panel_custom": {
                "name": "novustore-frontend",
                "embed_iframe": True,
                "trust_external": False,
                "js_url": js_url,
            }
        }
        
        hacs.log.info("Registering panel:")
        hacs.log.info("  - Domain: %s", DOMAIN)
        hacs.log.info("  - Title: %s", hacs.configuration.sidepanel_title)
        hacs.log.info("  - Icon: %s", hacs.configuration.sidepanel_icon)
        hacs.log.info("  - URL Path: %s", DOMAIN)
        hacs.log.info("  - JS URL: %s", js_url)
        hacs.log.info("  - Panel Name: novustore-frontend")
        
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title=hacs.configuration.sidepanel_title,
            sidebar_icon=hacs.configuration.sidepanel_icon,
            frontend_url_path=DOMAIN,
            config=panel_config,
            require_admin=True,
        )
        hacs.log.info("Panel registered successfully")
    else:
        hacs.log.warning("Panel already exists in frontend_panels - skipping registration")

    # Setup plugin endpoint if needed
    hacs.log.info("Setting up plugin endpoint...")
    await hacs.async_setup_frontend_endpoint_plugin()
    
    hacs.log.info("="*80)
    hacs.log.info("NOVUSTORE FRONTEND REGISTRATION COMPLETED")
    hacs.log.info("Panel should be accessible at: /novustore")
    hacs.log.info("Frontend files served from: %s", URL_BASE)
    hacs.log.info("="*80)
