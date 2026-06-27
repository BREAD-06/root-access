using System.Collections;
using UnityEngine;

/// <summary>
/// Applies UI "corruption" effects: jittering HUD elements around their anchored
/// positions and randomly flickering GameObjects on/off. All timing uses real time
/// so effects keep running while the game is paused (Time.timeScale == 0).
/// </summary>
public class GlitchEffect : MonoBehaviour
{
    [Header("Drift")]
    [Tooltip("HUD panels that should jitter when corruption is high.")]
    [SerializeField] private RectTransform[] hudElements;

    [Tooltip("Maximum drift distance, in anchored units, that DriftElements will apply.")]
    [SerializeField] private float maxDrift = 4f;

    /// <summary>
    /// Nudges every HUD element by a random offset within +/- intensity on both axes.
    /// Call repeatedly (e.g. each frame at high corruption) for a continuous jitter.
    /// </summary>
    /// <param name="intensity">Maximum offset magnitude per axis, in anchored units.</param>
    public void DriftElements(float intensity)
    {
        if (hudElements == null)
            return;

        // Never drift further than the configured ceiling.
        float clamped = Mathf.Min(intensity, maxDrift);

        foreach (RectTransform element in hudElements)
        {
            if (element == null)
                continue;

            Vector2 offset = new Vector2(
                Random.Range(-clamped, clamped),
                Random.Range(-clamped, clamped));

            element.anchoredPosition += offset;
        }
    }

    /// <summary>
    /// Randomly toggles a target GameObject's active state a number of times,
    /// with a random real-time delay between each toggle.
    /// </summary>
    /// <param name="target">The GameObject to flicker.</param>
    /// <param name="times">How many times to toggle.</param>
    /// <param name="minDelay">Minimum delay between toggles, in seconds.</param>
    /// <param name="maxDelay">Maximum delay between toggles, in seconds.</param>
    public IEnumerator FlickerCoroutine(GameObject target, int times, float minDelay, float maxDelay)
    {
        if (target == null)
            yield break;

        for (int i = 0; i < times; i++)
        {
            target.SetActive(!target.activeSelf);
            yield return new WaitForSecondsRealtime(Random.Range(minDelay, maxDelay));
        }
    }
}
