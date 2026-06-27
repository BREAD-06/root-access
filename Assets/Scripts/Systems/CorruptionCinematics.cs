using System.Collections;
using UnityEngine;
using Debugger01.Systems;

/// <summary>
/// Orchestrates Priority 2 cinematic sequences at corruption thresholds.
/// Replaces the simple hooks in HUDController with full-screen, 
/// multi-system cinematic moments.
/// </summary>
public class CorruptionCinematics : MonoBehaviour
{
    private HUDController hud;
    private PlayerController player;
    private RealityConsole console;

    private void Start()
    {
        hud = FindObjectOfType<HUDController>();
        player = FindObjectOfType<PlayerController>();
        console = RealityConsole.Instance;

        var cm = CorruptionManager.Instance;
        if (cm != null)
        {
            cm.OnThreshold25 += () => StartCoroutine(Cinematic25());
            cm.OnThreshold50 += () => StartCoroutine(Cinematic50());
            cm.OnThreshold75 += () => StartCoroutine(Cinematic75());
            cm.OnThreshold100 += () => StartCoroutine(Cinematic100());
        }
    }

    private IEnumerator Cinematic25()
    {
        // 25%: camera shake, HUD flicker, glitch flash, warning popup
        StartCoroutine(CameraShake(0.5f, 0.2f));
        if (hud != null)
        {
            hud.StartFlicker();
            hud.ShowWarning("Reality Stability Compromised");
        }
        
        // Glitch flash (white flash)
        yield return StartCoroutine(ScreenFlash(Color.white, 0.1f));
    }

    private IEnumerator Cinematic50()
    {
        // 50%: short freeze-frame, scanlines, lights flicker, message, audio distortion
        if (hud != null)
        {
            hud.EnableScanlines();
            hud.ShowWarning("ACCESS DETECTED");
        }

        // Audio distortion (pitch down globally)
        AudioListener.pause = true;
        
        // Freeze frame
        float originalTimeScale = Time.timeScale;
        Time.timeScale = 0f;
        yield return new WaitForSecondsRealtime(0.2f);
        Time.timeScale = originalTimeScale;
        
        AudioListener.pause = false;

        // Lights flicker
        Light[] lights = FindObjectsOfType<Light>();
        for (int i = 0; i < 6; i++)
        {
            foreach (var l in lights)
                l.enabled = !l.enabled;
            yield return new WaitForSeconds(Random.Range(0.05f, 0.15f));
        }
        foreach (var l in lights) l.enabled = true;
    }

    private IEnumerator Cinematic75()
    {
        // 75%: red warning lights, heavy glitch, fake terminal spam, enemy speed increase, camera shake
        StartCoroutine(CameraShake(1.5f, 0.4f));

        Light[] lights = FindObjectsOfType<Light>();
        foreach (var l in lights)
        {
            l.color = Color.red;
            l.intensity *= 1.5f;
        }

        if (hud != null) hud.StartFlicker();

        if (console != null)
        {
            StartCoroutine(console.TypeCommand("SYS.OVERRIDE --FORCE"));
        }

        yield return null;
        // Enemy speed increase is already handled by EnemyStateMachine.cs natively!
    }

    private IEnumerator Cinematic100()
    {
        // 100%: cinematic transition preparing boss arena
        if (player != null) player.enabled = false;
        
        StartCoroutine(CameraShake(3f, 0.5f));
        
        if (hud != null)
        {
            hud.ShowWarning("WARNING: Debugger-01 is the anomaly. Recalibrating...");
        }

        yield return new WaitForSeconds(2f);

        // Fade to white
        yield return StartCoroutine(ScreenFlash(Color.white, 2f));

        // Fake teleport / prepare arena
        if (player != null)
        {
            // Create a solid arena floor so the player doesn't fall
            GameObject arenaFloor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            arenaFloor.transform.position = Vector3.zero;
            arenaFloor.transform.localScale = new Vector3(20, 1, 20); // Make it large enough

            // Create some basic boundaries
            Renderer floorRend = arenaFloor.GetComponent<Renderer>();
            if (floorRend != null) floorRend.material.color = Color.black;

            // Reset position to center for "arena" safely above the floor
            player.transform.position = new Vector3(0, 2, 0); 
            
            // Reset velocity so they don't carry falling momentum
            Rigidbody rb = player.GetComponent<Rigidbody>();
            if (rb != null) rb.linearVelocity = Vector3.zero;

            player.enabled = true;
        }
    }

    private IEnumerator CameraShake(float duration, float magnitude)
    {
        if (Camera.main == null) yield break;
        
        Transform camTransform = Camera.main.transform;
        Vector3 originalPos = camTransform.localPosition;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            float x = Random.Range(-1f, 1f) * magnitude;
            float y = Random.Range(-1f, 1f) * magnitude;
            camTransform.localPosition = originalPos + new Vector3(x, y, 0);
            elapsed += Time.deltaTime;
            yield return null;
        }
        camTransform.localPosition = originalPos;
    }

    private IEnumerator ScreenFlash(Color flashColor, float duration)
    {
        // Simple screen flash using a temporary canvas
        GameObject canvasObj = new GameObject("FlashCanvas");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 1000;
        
        UnityEngine.UI.Image img = canvasObj.AddComponent<UnityEngine.UI.Image>();
        img.color = flashColor;
        
        float halfDuration = duration / 2f;
        float elapsed = 0f;
        
        // Fade in
        while (elapsed < halfDuration)
        {
            Color c = img.color;
            c.a = Mathf.Lerp(0f, 1f, elapsed / halfDuration);
            img.color = c;
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        elapsed = 0f;
        // Fade out
        while (elapsed < halfDuration)
        {
            Color c = img.color;
            c.a = Mathf.Lerp(1f, 0f, elapsed / halfDuration);
            img.color = c;
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        Destroy(canvasObj);
    }
}
