using UnityEngine;

/// <summary>
/// Raycasts from the main camera through the screen centre every frame and tracks
/// whatever object is under the crosshair, ignoring the "Player" layer.
/// </summary>
public class TargetingSystem : MonoBehaviour
{
    public float maxTargetDistance = 20f;

    public GameObject currentTarget { get; private set; }

    // Everything except the "Player" layer.
    private int targetMask;

    private void Awake()
    {
        // ~ inverts the mask so the Player layer is excluded from the raycast.
        targetMask = ~LayerMask.GetMask("Player");
    }

    private void Update()
    {
        Camera cam = Camera.main;
        if (cam == null)
        {
            currentTarget = null;
            return;
        }

        Ray ray = cam.ScreenPointToRay(new Vector3(Screen.width * 0.5f, Screen.height * 0.5f, 0f));

        if (Physics.Raycast(ray, out RaycastHit hit, maxTargetDistance, targetMask, QueryTriggerInteraction.Ignore))
            currentTarget = hit.collider.gameObject;
        else
            currentTarget = null;
    }

    /// <summary>Name of the current target, or "NO TARGET" when nothing is aimed at.</summary>
    public string GetTargetName()
    {
        return currentTarget != null ? currentTarget.name : "NO TARGET";
    }
}
