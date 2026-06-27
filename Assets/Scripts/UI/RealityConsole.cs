using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

/// <summary>
/// Singleton controller for the holographic terminal overlay ("Reality Console").
/// Handles opening/closing the console, pausing the game, feeding the current
/// target name into the HUD, and routing typed commands to the CommandExecutor.
/// Upgraded with history, auto-complete, sounds, and cinematic transitions.
/// </summary>
public class RealityConsole : MonoBehaviour
{
    // Globally-accessible singleton instance.
    public static RealityConsole Instance { get; private set; }

    [Header("Animation")]
    [Tooltip("Animator driving the console open/close. Must have a bool parameter named 'Open'.")]
    [SerializeField] private Animator consoleAnimator;
    [Tooltip("How long the holographic slide animation takes.")]
    [SerializeField] private float slideDuration = 0.25f;
    [Tooltip("The main visual panel to slide/scale (holographic effect).")]
    [SerializeField] private RectTransform consolePanel;

    [Header("UI References")]
    [Tooltip("The text field the player types commands into.")]
    [SerializeField] private TMP_InputField inputField;
    [Tooltip("Label that displays the currently selected target's name.")]
    [SerializeField] private TextMeshProUGUI targetLabel;
    [Tooltip("Label used to flash error messages (e.g. invalid command).")]
    [SerializeField] private TextMeshProUGUI errorLabel;
    [Tooltip("CanvasGroup wrapping the whole console (reserved for fade control).")]
    [SerializeField] private CanvasGroup consoleCanvasGroup;

    [Header("Audio")]
    [SerializeField] private AudioSource typingAudioSource;
    [SerializeField] private AudioClip typeSound;
    [SerializeField] private AudioClip errorSound;
    [SerializeField] private AudioClip bootSound;

    // Name of the Animator bool parameter that drives the open/close state.
    private const string OpenParam = "Open";

    // Tracks whether the console is currently open.
    private bool isOpen;

    // Command History
    private List<string> commandHistory = new List<string>();
    private int historyIndex = -1;

    // Autocomplete list
    private readonly string[] suggestions = { "freeze()", "delete()", "help", "clear", "SYS.OVERRIDE" };

    private Coroutine animationCoroutine;

    private void Awake()
    {
        // Enforce the singleton: keep the first instance, destroy any duplicates.
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Start()
    {
        // Setup initial hidden state
        if (consoleCanvasGroup != null)
        {
            consoleCanvasGroup.alpha = 0f;
            consoleCanvasGroup.interactable = false;
            consoleCanvasGroup.blocksRaycasts = false;
        }

        if (inputField != null)
        {
            inputField.onValueChanged.AddListener(OnInputValueChanged);
            // Setup blinking block cursor for retro terminal feel
            inputField.customCaretColor = true;
            inputField.caretColor = new Color(0.2f, 1f, 0.2f); // Neon green
            inputField.caretBlinkRate = 0.8f;
            inputField.caretWidth = 10;
        }
    }

    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
        if (inputField != null) inputField.onValueChanged.RemoveListener(OnInputValueChanged);
    }

    private void Update()
    {
        // Update() keeps firing while the game is paused (Time.timeScale == 0)
        if (targetLabel != null)
        {
            // Pull the live target name from the targeting system if it exists.
            targetLabel.text = TargetingSystem.Instance?.GetTargetName() ?? "NO TARGET";
        }

        if (isOpen && Keyboard.current != null)
        {
            // Submit
            if (Keyboard.current.enterKey.wasPressedThisFrame || Keyboard.current.numpadEnterKey.wasPressedThisFrame)
            {
                OnCommandSubmit(inputField != null ? inputField.text : string.Empty);
            }
            // Command History Navigation
            else if (Keyboard.current.upArrowKey.wasPressedThisFrame)
            {
                CycleHistory(-1);
            }
            else if (Keyboard.current.downArrowKey.wasPressedThisFrame)
            {
                CycleHistory(1);
            }
            // Auto-complete
            else if (Keyboard.current.tabKey.wasPressedThisFrame)
            {
                AutoComplete();
            }
        }
    }

    private void OnInputValueChanged(string value)
    {
        // Play typing sound on every keystroke
        if (typingAudioSource != null && typeSound != null && value.Length > 0)
        {
            typingAudioSource.pitch = Random.Range(0.9f, 1.1f);
            typingAudioSource.PlayOneShot(typeSound, 0.5f);
        }
    }

    /// <summary>
    /// Flips the console between open and closed states.
    /// Opening pauses the game and focuses the input field; closing resumes the game.
    /// </summary>
    public void Toggle()
    {
        isOpen = !isOpen;

        // Drive the open/close animation if an Animator is assigned
        if (consoleAnimator != null)
            consoleAnimator.SetBool(OpenParam, isOpen);

        // Drive the dynamic holographic slide animation
        if (animationCoroutine != null) StopCoroutine(animationCoroutine);
        animationCoroutine = StartCoroutine(AnimateConsole(isOpen));

        if (isOpen)
        {
            if (typingAudioSource != null && bootSound != null)
                typingAudioSource.PlayOneShot(bootSound);

            // Pause gameplay while the console is up.
            Time.timeScale = 0f;

            if (inputField != null)
            {
                inputField.text = string.Empty;
                inputField.ActivateInputField();
            }
            historyIndex = commandHistory.Count;
        }
        else
        {
            // Resume gameplay.
            Time.timeScale = 1f;
        }
    }

    // Coroutine to animate fade and holographic slide
    private IEnumerator AnimateConsole(bool show)
    {
        if (consoleCanvasGroup == null) yield break;

        float targetAlpha = show ? 1f : 0f;
        float startAlpha = consoleCanvasGroup.alpha;
        
        Vector3 startScale = consolePanel != null ? consolePanel.localScale : Vector3.one;
        Vector3 targetScale = show ? Vector3.one : new Vector3(1f, 0.01f, 1f); // Holographic slide (squash Y)
        
        if (show && consolePanel != null && consolePanel.localScale.y < 0.1f) 
        {
            consolePanel.localScale = new Vector3(1f, 0.01f, 1f);
            startScale = consolePanel.localScale;
        }

        consoleCanvasGroup.interactable = show;
        consoleCanvasGroup.blocksRaycasts = show;

        float elapsed = 0f;
        while (elapsed < slideDuration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = elapsed / slideDuration;
            
            // Ease out cubic
            float ease = 1f - Mathf.Pow(1f - t, 3f);
            
            consoleCanvasGroup.alpha = Mathf.Lerp(startAlpha, targetAlpha, ease);
            if (consolePanel != null) consolePanel.localScale = Vector3.Lerp(startScale, targetScale, ease);
            
            yield return null;
        }

        consoleCanvasGroup.alpha = targetAlpha;
        if (consolePanel != null) consolePanel.localScale = targetScale;
    }

    public void OnCommandSubmit(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return;

        // Add to history if unique
        if (commandHistory.Count == 0 || commandHistory[commandHistory.Count - 1] != input)
        {
            commandHistory.Add(input);
        }
        historyIndex = commandHistory.Count;

        // Satisfying camera recoil on command execution
        if (Debugger01.Systems.CameraEffects.Instance != null)
            Debugger01.Systems.CameraEffects.Instance.ApplyImpulse(Vector3.back, 0.15f);

        // Null-guarded so the project compiles/runs before CommandExecutor is implemented.
        CommandExecutor.Instance?.Execute(input);

        // Close the console after submitting.
        Toggle();
    }

    /// <summary>
    /// Briefly flashes an error message in red on the console.
    /// Added Glitch shake and error sound for Priority 3.
    /// </summary>
    public void ShowError(string message = "INVALID COMMAND")
    {
        if (errorLabel != null)
        {
            errorLabel.text = message;
            errorLabel.color = Color.red;
            errorLabel.gameObject.SetActive(true);
        }

        if (typingAudioSource != null && errorSound != null)
            typingAudioSource.PlayOneShot(errorSound);

        StopCoroutine(nameof(HideErrorAfterDelay));
        StartCoroutine(HideErrorAfterDelay());
        
        // Glitch shake the entire panel
        if (consolePanel != null && gameObject.activeInHierarchy)
            StartCoroutine(GlitchShake());
    }

    private IEnumerator HideErrorAfterDelay()
    {
        yield return new WaitForSecondsRealtime(1f);

        if (errorLabel != null)
            errorLabel.gameObject.SetActive(false);
    }

    private IEnumerator GlitchShake()
    {
        Vector3 originalPos = consolePanel.localPosition;
        for (int i = 0; i < 15; i++)
        {
            consolePanel.localPosition = originalPos + (Vector3)Random.insideUnitCircle * 8f;
            yield return new WaitForSecondsRealtime(0.015f);
        }
        consolePanel.localPosition = originalPos;
    }

    private void CycleHistory(int dir)
    {
        if (commandHistory.Count == 0) return;

        historyIndex += dir;
        historyIndex = Mathf.Clamp(historyIndex, 0, commandHistory.Count - 1);

        if (inputField != null)
        {
            inputField.text = commandHistory[historyIndex];
            inputField.caretPosition = inputField.text.Length;
        }
    }

    private void AutoComplete()
    {
        if (inputField == null || string.IsNullOrWhiteSpace(inputField.text)) return;
        
        string current = inputField.text.ToLower();
        foreach (string s in suggestions)
        {
            if (s.ToLower().StartsWith(current))
            {
                inputField.text = s;
                inputField.caretPosition = s.Length;
                return;
            }
        }
    }

    /// <summary>
    /// Types a command into the input field one character at a time, then submits it.
    /// Used by scripted sequences.
    /// </summary>
    public IEnumerator TypeCommand(string command)
    {
        if (inputField != null)
        {
            inputField.text = string.Empty;

            foreach (char c in command)
            {
                inputField.text += c;
                // Hooking into the typing sound manually
                OnInputValueChanged(inputField.text);
                yield return new WaitForSecondsRealtime(0.08f);
            }
        }

        yield return new WaitForSecondsRealtime(0.5f);
        OnCommandSubmit(command);
    }
}
