using UnityEngine;
using UnityEditor;
using System.IO;

[InitializeOnLoad]
public class SetupVisuals {
    static SetupVisuals() {
        EditorApplication.delayCall += RunOnce;
    }

    static void RunOnce() {
        EditorApplication.delayCall -= RunOnce;
        
        if (EditorApplication.isPlayingOrWillChangePlaymode || EditorApplication.isCompiling) return;
        
        string markerPath = "Assets/Editor/VisualsSetupDone.txt";
        if (File.Exists(markerPath)) return;

        Debug.Log("Setting up Lighting Visuals...");

        // Setup Lighting & Fog
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.ExponentialSquared;
        RenderSettings.fogDensity = 0.015f;
        RenderSettings.fogColor = new Color(0.01f, 0.01f, 0.05f); // Dark blue fog
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.02f, 0.02f, 0.05f);
        RenderSettings.skybox = null; 

        var dirLight = GameObject.Find("Directional Light");
        if (dirLight != null) {
            var l = dirLight.GetComponent<Light>();
            if (l != null) {
                l.color = new Color(0.2f, 0.3f, 0.6f); // Better directional light
                l.intensity = 0.3f;
                l.shadows = LightShadows.Soft;
            }
            dirLight.transform.rotation = Quaternion.Euler(30, -30, 0);
        }

        // Add Neon Point Lights around streets
        var lightsRoot = GameObject.Find("NeonLights");
        if (lightsRoot != null) {
            foreach(Transform child in lightsRoot.transform) {
                GameObject.DestroyImmediate(child.gameObject);
            }
        } else {
            lightsRoot = new GameObject("NeonLights");
        }
        
        Color[] neonColors = new Color[] { Color.cyan, Color.magenta, new Color(0.3f, 0f, 1f), new Color(0f, 1f, 0.8f) };
        for (int i = 0; i < 20; i++) {
            var plObj = new GameObject("NeonPointLight_" + i);
            plObj.transform.SetParent(lightsRoot.transform);
            
            var pl = plObj.AddComponent<Light>();
            pl.type = LightType.Point;
            pl.color = neonColors[Random.Range(0, neonColors.Length)];
            pl.intensity = 15f;
            pl.range = 8f;
            
            Vector2 randomCircle = Random.insideUnitCircle * 20f;
            plObj.transform.position = new Vector3(randomCircle.x, 1.5f, randomCircle.y);
        }

        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());
        UnityEditor.SceneManagement.EditorSceneManager.SaveOpenScenes();
        
        File.WriteAllText(markerPath, "done");
        Debug.Log("Visuals Setup Complete! Note: URP Volume must be added manually in Editor.");
    }
}
