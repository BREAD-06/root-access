using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Debugger01.Systems
{
    /// <summary>
    /// Handles the cinematic intro sequence (Priority 1).
    /// Spawns its own UI Canvas to ensure it works without manual scene setup.
    /// Fades from black, plays terminal boot sequence, subtitles, and orbits the camera.
    /// </summary>
    public class IntroManager : MonoBehaviour
    {
        [Header("Intro Settings")]
        public float textTypeDelay = 0.05f;
        public float cameraRotateSpeed = 15f;

        private PlayerController player;
        private Canvas introCanvas;
        private Image fader;
        private TextMeshProUGUI terminalText;
        private TextMeshProUGUI subtitleText;
        
        private bool isIntroPlaying = false;

        private void Start()
        {
            StartCoroutine(PlayIntroSequence());
        }

        private void Update()
        {
            if (isIntroPlaying && player != null)
            {
                // Slowly rotate the player body to give a panning camera effect around the environment
                player.transform.Rotate(Vector3.up, cameraRotateSpeed * Time.deltaTime);
            }
        }

        private IEnumerator PlayIntroSequence()
        {
            isIntroPlaying = true;
            
            // 1. Find and disable player
            player = FindObjectOfType<PlayerController>();
            if (player != null)
            {
                player.enabled = false;
            }

            // 2. Setup dynamic UI
            SetupUI();

            // 3. Fade in from black
            yield return StartCoroutine(FadeRoutine(1f, 0f, 2f));

            // 4. Terminal Boot Sequence
            yield return StartCoroutine(TypeTerminalText("BOOTING...\n"));
            yield return new WaitForSeconds(0.5f);
            yield return StartCoroutine(TypeTerminalText("Loading Memory...\n"));
            yield return new WaitForSeconds(0.5f);
            yield return StartCoroutine(TypeTerminalText("Connecting...\n"));
            yield return new WaitForSeconds(0.5f);
            yield return StartCoroutine(TypeTerminalText("Access Granted\n\n"));
            yield return new WaitForSeconds(1f);

            // 5. Glitch (Simple visual jitter)
            Vector3 originalPos = terminalText.transform.localPosition;
            for (int i = 0; i < 10; i++)
            {
                terminalText.transform.localPosition = originalPos + (Vector3)Random.insideUnitCircle * 20f;
                terminalText.color = Random.value > 0.5f ? Color.red : Color.green;
                yield return new WaitForSeconds(0.05f);
            }
            terminalText.transform.localPosition = originalPos;
            terminalText.color = Color.green;

            // 6. User Detected
            yield return StartCoroutine(TypeTerminalText("USER DETECTED\n\nIdentity: UNKNOWN"));
            yield return new WaitForSeconds(1.5f);

            // 7. Subtitle
            subtitleText.text = "<i>\"If you're seeing this...\nthe Architect already knows.\"</i>";
            subtitleText.color = new Color(1f, 1f, 1f, 0f);
            yield return StartCoroutine(FadeGraphic(subtitleText, 0f, 1f, 1f));
            
            yield return new WaitForSeconds(4f);

            // 8. Cleanup and handover control
            yield return StartCoroutine(FadeGraphic(terminalText, 1f, 0f, 1f));
            yield return StartCoroutine(FadeGraphic(subtitleText, 1f, 0f, 1f));
            
            if (player != null)
            {
                player.enabled = true;
            }
            
            isIntroPlaying = false;
            
            // Destroy the intro UI once done
            if (introCanvas != null)
            {
                Destroy(introCanvas.gameObject);
            }
        }

        private void SetupUI()
        {
            GameObject canvasObj = new GameObject("IntroCanvas");
            introCanvas = canvasObj.AddComponent<Canvas>();
            introCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            introCanvas.sortingOrder = 999;
            canvasObj.AddComponent<CanvasScaler>();
            canvasObj.AddComponent<GraphicRaycaster>();

            // Black Fader
            GameObject faderObj = new GameObject("Fader");
            faderObj.transform.SetParent(canvasObj.transform, false);
            fader = faderObj.AddComponent<Image>();
            fader.color = Color.black;
            fader.rectTransform.anchorMin = Vector2.zero;
            fader.rectTransform.anchorMax = Vector2.one;
            fader.rectTransform.sizeDelta = Vector2.zero;

            // Terminal Text
            GameObject textObj = new GameObject("TerminalText");
            textObj.transform.SetParent(canvasObj.transform, false);
            terminalText = textObj.AddComponent<TextMeshProUGUI>();
            // Fallback font - Unity creates a default text font if we don't supply one, but TMP requires a font asset.
            // Assuming there's a default TMP font available. If not, it might throw a warning.
            terminalText.color = Color.green;
            terminalText.fontSize = 24;
            terminalText.alignment = TextAlignmentOptions.TopLeft;
            terminalText.rectTransform.anchorMin = new Vector2(0.05f, 0.05f);
            terminalText.rectTransform.anchorMax = new Vector2(0.95f, 0.95f);
            terminalText.rectTransform.sizeDelta = Vector2.zero;
            terminalText.text = "";

            // Subtitle Text
            GameObject subObj = new GameObject("SubtitleText");
            subObj.transform.SetParent(canvasObj.transform, false);
            subtitleText = subObj.AddComponent<TextMeshProUGUI>();
            subtitleText.color = Color.clear; // starts hidden
            subtitleText.fontSize = 36;
            subtitleText.alignment = TextAlignmentOptions.Center;
            subtitleText.rectTransform.anchorMin = new Vector2(0.1f, 0.1f);
            subtitleText.rectTransform.anchorMax = new Vector2(0.9f, 0.3f);
            subtitleText.rectTransform.sizeDelta = Vector2.zero;
            subtitleText.text = "";
        }

        private IEnumerator TypeTerminalText(string textToType)
        {
            foreach (char c in textToType)
            {
                terminalText.text += c;
                yield return new WaitForSeconds(textTypeDelay);
            }
        }

        private IEnumerator FadeRoutine(float startAlpha, float endAlpha, float duration)
        {
            yield return FadeGraphic(fader, startAlpha, endAlpha, duration);
        }

        private IEnumerator FadeGraphic(Graphic g, float start, float end, float duration)
        {
            float elapsed = 0f;
            Color c = g.color;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                c.a = Mathf.Lerp(start, end, elapsed / duration);
                g.color = c;
                yield return null;
            }
            c.a = end;
            g.color = c;
        }
    }
}
