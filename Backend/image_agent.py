import os
import requests
import base64
from dotenv import load_dotenv

load_dotenv()


class ImageGenerationAgent:
    def __init__(self):
        self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.api_token = os.getenv("CLOUDFLARE_API_TOKEN")

        self.model = "@cf/black-forest-labs/flux-2-klein-9b"

        if not self.account_id:
            raise RuntimeError("CLOUDFLARE_ACCOUNT_ID is not configured.")

        if not self.api_token:
            raise RuntimeError("CLOUDFLARE_API_TOKEN is not configured.")

        self.url = (
            f"https://api.cloudflare.com/client/v4/accounts/"
            f"{self.account_id}/ai/run/{self.model}"
        )

    def _get_dimensions(self, aspect_ratio="16:9", image_size="1K"):
        sizes = {
            "1K": 1024,
            "2K": 1536,
        }

        base = sizes.get(image_size, 1024)

        ratios = {
            "1:1": (base, base),
            "16:9": (base, int(base * 9 / 16)),
            "9:16": (int(base * 9 / 16), base),
            "4:3": (base, int(base * 3 / 4)),
            "3:4": (int(base * 3 / 4), base),
        }

        return ratios.get(aspect_ratio, (1024, 1024))

    def generate(
        self,
        prompt,
        aspect_ratio="16:9",
        image_size="1K",
    ):
        if not prompt or not prompt.strip():
            raise ValueError("Image prompt cannot be empty.")

        width, height = self._get_dimensions(aspect_ratio, image_size)

        # Removed 'Content-Type: application/json' so requests can set multipart boundaries
        headers = {
            "Authorization": f"Bearer {self.api_token}",
        }

        # Use files= to send as multipart/form-data
        files = {
            "prompt": (None, prompt.strip()),
            "width": (None, str(width)),
            "height": (None, str(height)),
        }

        try:
            response = requests.post(
                self.url,
                headers=headers,
                files=files,
                timeout=120,
            )

            content_type = response.headers.get("Content-Type", "")

            # 1. Check if Cloudflare returned a JSON error or wrapped JSON response
            if "application/json" in content_type:
                data = response.json()
                
                if not data.get("success", True):
                    raise RuntimeError(f"Cloudflare Error: {data.get('errors')}")
                
                if "result" in data and isinstance(data["result"], dict) and "image" in data["result"]:
                    image_base64 = data["result"]["image"]
                    return {
                        "success": True,
                        "image": f"data:image/png;base64,{image_base64}",
                        "mime_type": "image/png",
                        "width": width,
                        "height": height,
                        "model": self.model,
                    }

            # 2. Handle cases where Cloudflare successfully returns raw binary image bytes
            response.raise_for_status()
            image_bytes = response.content

            if not image_bytes:
                raise RuntimeError("Cloudflare returned an empty response.")

            mime_type = content_type if content_type.startswith("image/") else "image/png"
            image_base64 = base64.b64encode(image_bytes).decode("utf-8")

            return {
                "success": True,
                "image": f"data:{mime_type};base64,{image_base64}",
                "mime_type": mime_type,
                "width": width,
                "height": height,
                "model": self.model,
            }

        except Exception as exc:
            raise RuntimeError(f"Image generation failed: {exc}")