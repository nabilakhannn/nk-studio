# Changelog

## 1.0.5

- Stops masked or incomplete Higgsfield keys before any connection request is sent.
- Gives beginners a direct instruction to use Higgsfield's Copy API Key button.
- Preserves an already working connection when a replacement key is invalid.
- Accepts the common `HF_CREDENTIALS` copy format as well as the raw combined key.

## 1.0.4

- Fixed the one-field API connection completing successfully but failing while clearing the form.
- Added an automated browser test for the full Connect and test interaction.

## 1.0.2

- Replaced the technical Key ID and Key Secret form with one clear API-key field.
- NK Studio now accepts the combined credential copied directly from Higgsfield.
- Connection is tested before the credential is saved privately.

## 1.0.1

- Fixed B-roll mode silently switching to text-only generation.
- B-roll now defaults to the uploaded character or starting image.
- Kept the start-mode selector visible so users can deliberately choose image or text generation.
- Added clear character-reference guidance beside the upload control.
- Simplified the automatic B-roll prompt to one location, one action and one camera move for more stable results.
- Added browser coverage that verifies image mode and the character upload remain active.

## 1.0.0

- Initial public release.
