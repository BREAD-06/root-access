using UnityEngine;

/// <summary>
/// TEMPORARY STUB. Minimal singleton so PlayerController can call
/// RealityConsole.Instance.Toggle() and the project compiles.
/// Full implementation lands in Prompt 2.
/// </summary>
public class RealityConsole : MonoBehaviour
{
    public static RealityConsole Instance { get; private set; }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void OnDestroy()
    {
        if (Instance == this)
            Instance = null;
    }

    /// <summary>Toggles the console UI. No-op for now — implemented in Prompt 2.</summary>
    public void Toggle()
    {
        // TODO: show/hide the reality console panel.
    }
}
