using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// Central dispatcher for command feedback. Other systems call this rather than
/// spawning effects themselves. This is a lightweight placeholder implementation —
/// a quick emissive/scale "glitch punch" and a dissolve-by-shrink — so the loop has
/// readable feedback before the real Shader Graph dissolve and particles land.
/// </summary>
public class VFXManager : MonoBehaviour
{
    public static VFXManager Instance { get; private set; }

    [Tooltip("Seconds the dissolve shrink takes before the object is removed.")]
    public float dissolveDuration = 0.35f;

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

    /// <summary>Plays a short reaction on the target for the given command.</summary>
    public void PlayCommandVFX(string commandName, GameObject target)
    {
        if (target == null)
            return;

        Color flash = commandName switch
        {
            "delete"  => new Color(1f, 0.2f, 0.2f),
            "clone"   => new Color(0.3f, 1f, 0.5f),
            "gravity" => new Color(0.8f, 0.3f, 1f),
            "freeze"  => new Color(0.3f, 0.8f, 1f),
            _          => new Color(0.3f, 0.9f, 1f),
        };
        StartCoroutine(FlashRoutine(target, flash));
    }

    /// <summary>Shrinks the target away, then invokes <paramref name="onComplete"/> (e.g. Destroy).</summary>
    public void PlayDissolve(GameObject target, Action onComplete = null)
    {
        if (target == null)
        {
            onComplete?.Invoke();
            return;
        }
        StartCoroutine(DissolveRoutine(target, onComplete));
    }

    private IEnumerator FlashRoutine(GameObject target, Color color)
    {
        var renderer = target.GetComponentInChildren<Renderer>();
        if (renderer == null)
            yield break;

        Material mat = renderer.material; // instance, safe to tweak
        Color original = mat.HasProperty("_Color") ? mat.color : Color.white;
        bool hadEmission = mat.IsKeywordEnabled("_EMISSION");
        Color originalEmission = mat.HasProperty("_EmissionColor") ? mat.GetColor("_EmissionColor") : Color.black;

        mat.EnableKeyword("_EMISSION");

        const float dur = 0.25f;
        for (float t = 0f; t < dur; t += Time.deltaTime)
        {
            float k = 1f - (t / dur);
            if (mat.HasProperty("_EmissionColor"))
                mat.SetColor("_EmissionColor", color * k * 2f);
            if (mat.HasProperty("_Color"))
                mat.color = Color.Lerp(original, color, k * 0.6f);
            yield return null;
        }

        // Restore.
        if (target != null)
        {
            if (mat.HasProperty("_Color")) mat.color = original;
            if (mat.HasProperty("_EmissionColor")) mat.SetColor("_EmissionColor", originalEmission);
            if (!hadEmission) mat.DisableKeyword("_EMISSION");
        }
    }

    private IEnumerator DissolveRoutine(GameObject target, Action onComplete)
    {
        Vector3 startScale = target.transform.localScale;
        for (float t = 0f; t < dissolveDuration; t += Time.deltaTime)
        {
            if (target == null) yield break;
            float k = 1f - (t / dissolveDuration);
            target.transform.localScale = startScale * k;
            target.transform.Rotate(Vector3.up, 360f * Time.deltaTime);
            yield return null;
        }
        onComplete?.Invoke();
    }
}
