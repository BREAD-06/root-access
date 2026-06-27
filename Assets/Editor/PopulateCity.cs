using UnityEngine;
using UnityEditor;
using UnityEngine.AI;
using UnityEditor.Animations;
using System.IO;
using System.Collections.Generic;

[InitializeOnLoad]
public class PopulateCity {
    static PopulateCity() {
        EditorApplication.delayCall += RunOnce;
    }

    static void RunOnce() {
        EditorApplication.delayCall -= RunOnce;
        if (EditorApplication.isPlayingOrWillChangePlaymode || EditorApplication.isCompiling) return;
        
        string markerPath = "Assets/Editor/PopulateCityDone.txt";
        if (File.Exists(markerPath)) return;

        var enemiesRoot = GameObject.Find("Enemies");
        if (enemiesRoot == null) return;

        GameObject baseDrone = null;
        foreach (var c in GameObject.FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None)) {
            if (c.GetType().Name == "PatrolDrone" || c.GetType().Name == "EnemyStateMachine") {
                baseDrone = c.gameObject;
                break;
            }
        }
        if (baseDrone == null) return;

        // Clean up any extra enemies from before
        foreach (var c in GameObject.FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None)) {
            if ((c.GetType().Name == "PatrolDrone" || c.GetType().Name == "EnemyStateMachine") && c.gameObject != baseDrone) {
                GameObject.DestroyImmediate(c.gameObject);
            }
        }

        var xBotPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Animations/Enemy/X Bot.fbx");
        var robotPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Enemies/patroldrones/FreeLowPolyRobot/Meshes_and_Animations/ModularRobots.fbx");
        var enemyCtrl = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/Art/Animations/Enemy.controller");

        List<Vector3> usedPositions = new List<Vector3>();
        int spawnCount = Random.Range(20, 31); 
        
        for (int i = 0; i < spawnCount; i++) {
            Vector3 pos = GetValidNavMeshPosition(usedPositions, 4f);
            if (pos == Vector3.zero) continue; 
            
            usedPositions.Add(pos);
            
            GameObject drone;
            if (i == 0) {
                drone = baseDrone;
            } else {
                drone = GameObject.Instantiate(baseDrone, enemiesRoot.transform);
            }
            drone.name = "PatrolDrone_" + i;
            
            // Warp safely on navmesh
            var agent = drone.GetComponent<NavMeshAgent>();
            if (agent != null) agent.enabled = false;
            drone.transform.position = pos;
            if (agent != null) agent.enabled = true;

            // Remove existing graphics
            var toDestroy = new List<GameObject>();
            foreach (Transform child in drone.transform) {
                if (child.name.Contains("X Bot") || child.name.Contains("ModularRobots") || child.GetComponent<Animator>() != null) {
                    toDestroy.Add(child.gameObject);
                }
            }
            foreach (var d in toDestroy) GameObject.DestroyImmediate(d);

            // Add graphic
            var prefab = (Random.value > 0.5f) ? xBotPrefab : robotPrefab;
            var model = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            model.transform.SetParent(drone.transform);
            model.transform.localPosition = new Vector3(0, -1f, 0); 
            model.transform.localRotation = Quaternion.identity;

            var anim = model.GetComponent<Animator>();
            if (anim == null) anim = model.AddComponent<Animator>();
            anim.runtimeAnimatorController = enemyCtrl;

            // Create waypoints
            var droneScript = drone.GetComponent("PatrolDrone");
            if (droneScript != null) {
                var wps = new Transform[3];
                var wpRoot = new GameObject("Waypoints_" + i);
                wpRoot.transform.SetParent(enemiesRoot.transform);
                for (int w = 0; w < 3; w++) {
                    var wpObj = new GameObject("WP_" + w);
                    wpObj.transform.SetParent(wpRoot.transform);
                    wpObj.transform.position = GetValidNavMeshPositionNear(pos, 15f);
                    wps[w] = wpObj.transform;
                }
                
                var field = droneScript.GetType().GetField("waypoints", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
                if (field != null) {
                    field.SetValue(droneScript, wps);
                }
            }
        }

        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());
        UnityEditor.SceneManagement.EditorSceneManager.SaveOpenScenes();
        
        File.WriteAllText(markerPath, "done");
        Debug.Log("City populated with " + spawnCount + " enemies on the NavMesh.");
    }

    static Vector3 GetValidNavMeshPosition(List<Vector3> existing, float minDistance) {
        for (int i = 0; i < 150; i++) {
            Vector2 rand2D = Random.insideUnitCircle * 80f;
            Vector3 randomPos = new Vector3(rand2D.x, 2f, rand2D.y);
            
            NavMeshHit hit;
            if (NavMesh.SamplePosition(randomPos, out hit, 10f, NavMesh.AllAreas)) {
                bool overlap = false;
                foreach (var ex in existing) {
                    if (Vector3.Distance(hit.position, ex) < minDistance) {
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) return hit.position;
            }
        }
        return Vector3.zero;
    }

    static Vector3 GetValidNavMeshPositionNear(Vector3 center, float radius) {
        for (int i = 0; i < 50; i++) {
            Vector2 rand2D = Random.insideUnitCircle * radius;
            Vector3 randomPos = center + new Vector3(rand2D.x, 0, rand2D.y);
            
            NavMeshHit hit;
            if (NavMesh.SamplePosition(randomPos, out hit, 10f, NavMesh.AllAreas)) {
                return hit.position;
            }
        }
        return center;
    }
}
