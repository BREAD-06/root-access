using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Drives the in-game HUD and reacts to corruption events. 
/// Upgraded with smooth slider animation, breathing text effects, 
/// canvas group fading for warnings, and dynamic floating notifications.
/// </summary>
public class HUDController : MonoBehaviour
{
    [Header("Corruption Meter")]
    [Tooltip("Slider that visualises the current corruption level (0..1).")]
    [SerializeField] private Slider corruptionSlider;

    [Tooltip("Label showing the remaining simulation stability percentage.")]
    [SerializeField] private TextMeshProUGUI stabilityLabel;

    [Header("System Readout")]
    [Tooltip("Top-left system identity label.")]
    [SerializeField] private TextMeshProUGUI systemLabel;

    [Header("Warnings")]
    [Tooltip("Overlay shown when a warning is broadcast. Should contain a child TextMeshProUGUI.")]
    [SerializeField] private GameObject warningOverlay;

    [Header("Animation Settings")]
    [SerializeField] private float smoothFillSpeed = 3f;
    [SerializeField] private float breatheSpeed = 2f;
    [SerializeField] private float breatheAmount = 0.02f;

    private float targetCorruption;
    private CanvasGroup warningCanvasGroup;
    private TextMeshProUGUI warningLabel;
    private Coroutine warningCoroutine;

    private void Start()
    {
        // Static system identity text.
        if (systemLabel != null)
            systemLabel.text = "DEBUGGER-01 | Root Access: Level 2";

        // Setup smooth warning overlay dynamically to preserve existing Inspector hooks
        if (warningOverlay != null)
        {
            warningCanvasGroup = warningOverlay.GetComponent<CanvasGroup>();
            if (warningCanvasGroup == null)
                warningCanvasGroup = warningOverlay.AddComponent<CanvasGroup>();

            warningLabel = warningOverlay.GetComponentInChildren<TextMeshProUGUI>(true);

            warningCanvasGroup.alpha = 0f;
            warningOverlay.SetActive(false);
        }

        // Subscribe to corruption events.
        var cm = CorruptionManager.Instance;
        if (cm != null)
        {
            cm.OnCorruptionChanged += UpdateHUD;
            targetCorruption = cm.Corruption;
        }
    }

    private void OnDestroy()
    {
        var cm = CorruptionManager.Instance;
        if (cm != null)
        {
            cm.OnCorruptionChanged -= UpdateHUD;
        }
    }

    private void Update()
    {
        // 1. Smoothly animate the corruption slider instead of snapping
        if (corruptionSlider != null)
        {
            corruptionSlider.value = Mathf.Lerp(corruptionSlider.value, targetCorruption / 100f, Time.deltaTime * smoothFillSpeed);
        }

        // 2. Smoothly update stability label based on the slider's visual position
        if (stabilityLabel != null)
        {
            float currentStability = 100f - (corruptionSlider != null ? corruptionSlider.value * 100f : targetCorruption);
            stabilityLabel.text = $"Simulation Stability: {currentStability:F0}%";
        }

        // 3. Subtle breathing animation for immersion
        float scale = 1f + Mathf.Sin(Time.unscaledTime * breatheSpeed) * breatheAmount;
        Vector3 breatheScale = new Vector3(scale, scale, 1f);

        if (systemLabel != null) systemLabel.transform.localScale = breatheScale;
        if (stabilityLabel != null) stabilityLabel.transform.localScale = breatheScale;
    }

    /// <summary>
    /// Updates the target corruption for smooth Lerping.
    /// </summary>
    public void UpdateHUD(float corruption)
    {
        targetCorruption = corruption;
    }

    /// <summary>
    /// Randomly flickers the corruption meter a handful of times.
    /// </summary>
    public void StartFlicker()
    {
        StartCoroutine(FlickerRoutine());
    }

    private IEnumerator FlickerRoutine()
    {
        if (corruptionSlider == null)
            yield break;

        GameObject target = corruptionSlider.gameObject;

        for (int i = 0; i < 5; i++)
        {
            target.SetActive(!target.activeSelf);
            yield return new WaitForSecondsRealtime(Random.Range(0.05f, 0.15f));
        }
        target.SetActive(true);
    }

    public void EnableScanlines()
    {
        Debug.Log("Scanlines enabled on HUD");
    }

    /// <summary>
    /// Smoothly fades a warning on and off screen.
    /// </summary>
    public void ShowWarning(string text)
    {
        if (warningOverlay == null || warningLabel == null) return;
        
        warningLabel.text = text;
        
        if (warningCoroutine != null) StopCoroutine(warningCoroutine);
        warningCoroutine = StartCoroutine(FadeWarningRoutine());
    }

    private IEnumerator FadeWarningRoutine()
    {
        warningOverlay.SetActive(true);
        
        // Fade in
        float elapsed = 0f;
        while (elapsed < 0.5f)
        {
            elapsed += Time.unscaledDeltaTime;
            if (warningCanvasGroup != null) 
                warningCanvasGroup.alpha = Mathf.Lerp(0f, 1f, elapsed / 0.5f);
            yield return null;
        }

        yield return new WaitForSecondsRealtime(2.5f);

        // Fade out
        elapsed = 0f;
        while (elapsed < 0.5f)
        {
            elapsed += Time.unscaledDeltaTime;
            if (warningCanvasGroup != null) 
                warningCanvasGroup.alpha = Mathf.Lerp(1f, 0f, elapsed / 0.5f);
            yield return null;
        }

        warningOverlay.SetActive(false);
    }

    /// <summary>
    /// Spawns a dynamic floating text notification on the HUD.
    /// </summary>
    public void ShowNotification(string text, Color color)
    {
        StartCoroutine(FloatingNotificationRoutine(text, color));
    }

    private IEnumerator FloatingNotificationRoutine(string text, Color color)
    {
        // Dynamically create a text object as a child of the HUD
        GameObject notifObj = new GameObject("FloatingNotification");
        notifObj.transform.SetParent(this.transform, false);
        
        TextMeshProUGUI tmp = notifObj.AddComponent<TextMeshProUGUI>();
        // Fallback font - unity creates a default text font if we don't supply one, but TMP requires a font asset.
        tmp.font = Resources.Load<TMP_FontAsset>("Fonts & Materials/LiberationSans SDF"); 
        tmp.text = text;
        tmp.color = color;
        tmp.fontSize = 24;
        tmp.alignment = TextAlignmentOptions.Center;
        
        // Position it near the center of the screen, slightly elevated
        RectTransform rt = tmp.rectTransform;
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.anchoredPosition = new Vector2(0, 100f);
        
        float duration = 2.5f;
        float elapsed = 0f;
        
        Vector2 startPos = rt.anchoredPosition;
        Vector2 endPos = startPos + new Vector2(0, 80f); // Float upward

        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = elapsed / duration;
            
            // Float up smoothly (ease out)
            float ease = 1f - Mathf.Pow(1f - t, 2f);
            rt.anchoredPosition = Vector2.Lerp(startPos, endPos, ease);
            
            // Fade out in the second half
            if (t > 0.5f)
            {
                float alpha = Mathf.Lerp(1f, 0f, (t - 0.5f) * 2f);
                Color c = tmp.color;
                c.a = alpha;
                tmp.color = c;
            }
            
            yield return null;
        }
        
        Destroy(notifObj);
    }
}
