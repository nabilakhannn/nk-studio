# Start Here (Non-coder)

1. Install Node.js 20 or newer.
2. Open this folder in Codex or Claude Code.
3. Say: `Read README.md, run the tests, start NK Studio, then open it for me. Do not ask for or display my API secrets. I will paste them into the private Settings screen.`
4. Open **Settings** inside NK Studio. Paste your own Higgsfield Key ID and Key Secret and press **Save privately**.
5. Set a small 30-day cap, press **Test connection**, then use Image or Video + B-roll.

On Image or Video, first choose the model. NK Studio will show what that model is good for and reveal only the controls it actually supports. For the easiest product-ad demo, use **Marketing Studio Image** for the hero frame and **Kling 3.0 Standard** for controlled movement. Choose **Seedance 2.5** when you need a longer 4–30 second story-led clip.

Always press **See real price** before **Generate**. The second button stays disabled until a current estimate succeeds.

For editor B-roll: open **Video + B-roll**, choose **B-roll Generator**, keep **My uploaded character or image** selected, and upload the exact character, product or scene you want to preserve. Paste one narration line, choose a visual style, and click **Build my B-roll prompt**. That prompt-building step is free. Review it, choose any supported model, then check the real API price before generating. Select **Text only** only when character consistency does not matter.

The app runs on your computer at `http://127.0.0.1:4180`. It is not a hosted multi-user service. If you put it online, you must add proper authentication, encrypted secret storage, abuse controls, secure object storage and a production database first.
