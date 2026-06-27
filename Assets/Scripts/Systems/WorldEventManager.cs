using System.Collections;
using UnityEngine;
using System.Collections.Generic;

namespace Debugger01.Systems
{
    /// <summary>
    /// Handles continuous world immersion features (Priority 6).
    /// Polls the global corruption level and fires randomized ambient events
    /// (light flickers, glitches, HUD spam) at a frequency scaled by corruption.
    /// </summary>
    public class WorldEventManager : MonoBehaviour
    {
        [Header("Event Settings")]
        [Tooltip("Time between random events at 0% corruption.")]
        public float baseEventInterval = 12f;
        [Tooltip("Time between random events at 100% corruption.")]
        public float minEventInterval = 1.5f;

        [Header("Audio (Optional)")]
        public AudioClip distantSiren;
        public AudioClip digitalGlitchSound;

        private Light[] allLights;
        private HUDController hud;
        private AudioSource audioSource;
        
        private readonly string[] randomMessages = {
            "WARN: MEMORY LEAK IN SECTOR 7",
            "SYS.ERR: REALITY DESYNC",
            "CONNECTION INTERRUPTED",
            "UNAUTHORIZED ACCESS DETECTED",
            "GARBAGE COLLECTION FAILED",
            "THREAD ABORTED",
            "CORRUPTION SPREADING"
        };

        private void Start()
        {
            // Cache heavy lookups
            allLights = FindObjectsOfType<Light>();
            hud = FindObjectOfType<HUDController>();
            
            // Setup audio for ambient events
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.spatialBlend = 0f; // 2D sound for HUD/UI glitches
            
            StartCoroutine(EventLoop());
        }

        private IEnumerator EventLoop()
        {
            while (true)
            {
                float corruption = 0f;
                if (CorruptionManager.Instance != null)
                {
                    corruption = CorruptionManager.Instance.Corruption;
                }

                // The higher the corruption, the faster events trigger
                float currentInterval = Mathf.Lerp(baseEventInterval, minEventInterval, corruption / 100f);
                
                // Wait for the interval (with a +/- 20% variance so it doesn't feel robotic)
                yield return new WaitForSeconds(currentInterval * Random.Range(0.8f, 1.2f));

                // Only trigger random nuisance events if corruption is above a baseline (e.g. 10%)
                if (corruption > 10f)
                {
                    TriggerRandomEvent(corruption);
                }
            }
        }

        private void TriggerRandomEvent(float corruptionLevel)
        {
            // Pick a random event type
            int eventType = Random.Range(0, 4);

            switch (eventType)
            {
                case 0: // Random Light Flicker
                    if (allLights != null && allLights.Length > 0)
                    {
                        Light targetLight = allLights[Random.Range(0, allLights.Length)];
                        if (targetLight != null) StartCoroutine(FlickerLight(targetLight));
                    }
                    break;

                case 1: // Screen Glitch / Micro Shake
                    if (hud != null) hud.StartFlicker();
                    // Shake camera slightly based on corruption severity
                    if (CameraEffects.Instance != null) 
                        CameraEffects.Instance.ApplyImpulse(Random.insideUnitSphere, 0.15f * (corruptionLevel / 50f));
                    
                    if (digitalGlitchSound != null) 
                        audioSource.PlayOneShot(digitalGlitchSound, 0.4f);
                    break;

                case 2: // Terminal Spam
                    if (hud != null)
                    {
                        string msg = randomMessages[Random.Range(0, randomMessages.Length)];
                        Color col = Random.value > 0.5f ? Color.red : new Color(1f, 0.6f, 0f); // Red or Orange
                        hud.ShowNotification(msg, col);
                    }
                    break;

                case 3: // Ambient Siren (Only if things are getting really bad)
                    if (corruptionLevel > 40f && distantSiren != null && !audioSource.isPlaying)
                    {
                        audioSource.PlayOneShot(distantSiren, 0.3f);
                    }
                    else if (hud != null) 
                    {
                        // Fallback to more terminal spam if no audio is configured
                        hud.ShowNotification("SYSTEM INTEGRITY FAILING", Color.red);
                    }
                    break;
            }
        }

        private IEnumerator FlickerLight(Light l)
        {
            bool origState = l.enabled;
            int flickers = Random.Range(2, 6);
            
            for (int i = 0; i < flickers; i++)
            {
                if (l == null) yield break;
                l.enabled = !l.enabled;
                yield return new WaitForSeconds(Random.Range(0.05f, 0.2f));
            }
            
            if (l != null) l.enabled = origState;
        }
    }
}
