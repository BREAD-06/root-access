using UnityEngine;

namespace Debugger01.Systems
{
    /// <summary>
    /// Handles procedural camera animations: Head bob, idle sway, 
    /// FOV zooming (for console), landing shakes, and command impulses.
    /// Priority 5 implementation.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class CameraEffects : MonoBehaviour
    {
        public static CameraEffects Instance { get; private set; }

        [Header("FOV & Zoom")]
        public float normalFOV = 60f;
        public float consoleZoomFOV = 45f;
        public float zoomSpeed = 8f;

        [Header("Head Bob & Sway")]
        public float bobFrequency = 14f;
        public float bobAmplitude = 0.05f;
        public float swayFrequency = 2f;
        public float swayAmplitude = 0.015f;

        [Header("Shake & Impulse")]
        public float shakeRecoverySpeed = 10f;
        
        private Camera cam;
        private Vector3 originalLocalPos;
        private Rigidbody playerRb;
        
        private float bobTimer = 0f;
        private Vector3 currentShakeOffset = Vector3.zero;
        
        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            
            cam = GetComponent<Camera>();
            originalLocalPos = transform.localPosition;
        }
        
        private void Start()
        {
            var player = FindObjectOfType<PlayerController>();
            if (player != null) playerRb = player.GetComponent<Rigidbody>();
        }

        private void LateUpdate()
        {
            // 1. FOV Zoom (Check if game is paused by console)
            bool isConsoleOpen = Time.timeScale == 0f; 
            float targetFOV = isConsoleOpen ? consoleZoomFOV : normalFOV;
            cam.fieldOfView = Mathf.Lerp(cam.fieldOfView, targetFOV, Time.unscaledDeltaTime * zoomSpeed);

            // 2. Head Bob & Sway
            float speed = 0f;
            if (playerRb != null)
            {
                Vector3 vel = playerRb.linearVelocity;
                vel.y = 0;
                speed = vel.magnitude;
            }

            Vector3 bobOffset = Vector3.zero;
            if (speed > 0.1f && !isConsoleOpen)
            {
                // Walking Bob
                bobTimer += Time.deltaTime * bobFrequency;
                bobOffset.y = Mathf.Sin(bobTimer) * bobAmplitude;
                bobOffset.x = Mathf.Cos(bobTimer / 2f) * bobAmplitude * 0.5f;
            }
            else
            {
                // Idle Sway
                bobTimer += Time.unscaledDeltaTime * swayFrequency;
                bobOffset.y = Mathf.Sin(bobTimer) * swayAmplitude;
                bobOffset.x = Mathf.Cos(bobTimer / 2f) * swayAmplitude;
            }

            // 3. Shake Recovery (Damped spring back to zero)
            currentShakeOffset = Vector3.Lerp(currentShakeOffset, Vector3.zero, Time.unscaledDeltaTime * shakeRecoverySpeed);

            // 4. Apply all local position modifications safely
            transform.localPosition = originalLocalPos + bobOffset + currentShakeOffset;
        }

        /// <summary>
        /// Jolts the camera in a specific direction.
        /// </summary>
        public void ApplyImpulse(Vector3 direction, float magnitude)
        {
            currentShakeOffset += direction.normalized * magnitude;
        }

        /// <summary>
        /// Hard downward shake when hitting the ground.
        /// </summary>
        public void ApplyLandingShake()
        {
            ApplyImpulse(Vector3.down, 0.25f);
        }
        
        /// <summary>
        /// Random shake when taking damage.
        /// </summary>
        public void ApplyHitFeedback()
        {
            ApplyImpulse(Random.insideUnitSphere, 0.5f);
        }
    }
}
