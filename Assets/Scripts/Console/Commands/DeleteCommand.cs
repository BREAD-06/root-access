using UnityEngine;

/// <summary>delete() — destroys the target object. Walls, enemies, cover.</summary>
public class DeleteCommand : ICommand
{
    public string CommandName => "delete";
    public float CorruptionCost => 20f;

    public bool CanExecute(GameObject target, string arg)
    {
        return target != null && !target.CompareTag("Player");
    }

    public void Execute(GameObject target, string arg)
    {
        // VFXManager plays a dissolve flash, then removes the object.
        if (VFXManager.Instance != null)
            VFXManager.Instance.PlayDissolve(target, () => Object.Destroy(target));
        else
            Object.Destroy(target);
    }
}
