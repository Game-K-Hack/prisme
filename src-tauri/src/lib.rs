use tauri::Manager;

/// Point d'entrée principal de l'application Tauri.
/// Enregistre les plugins et configure le gestionnaire de fenêtres.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Plugin HTTP : permet aux commandes Tauri de faire des requêtes externes
        // (API data.gouv.fr, APIs carburant, SNCF, etc.)
        // Les permissions sont déclarées dans capabilities/default.json
        .plugin(tauri_plugin_http::init())
        // Configuration des fenêtres au démarrage
        .setup(|app| {
            let window = app.get_webview_window("main")
                .expect("La fenêtre principale 'main' doit être définie dans tauri.conf.json");

            // En mode dev : ouvre les DevTools automatiquement
            #[cfg(debug_assertions)]
            window.open_devtools();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Ajoutez ici vos commandes Tauri personnalisées :
            // fetch_fuel_prices,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur au démarrage de l'application Prisme");
}

// ─── Exemple de commande Tauri ────────────────────────────────────────────────
// Décommentez et adaptez pour appeler des APIs externes depuis Rust.
//
// #[tauri::command]
// async fn fetch_fuel_prices() -> Result<String, String> {
//     // Utilisez reqwest ou tauri-plugin-http depuis Rust
//     // pour proxy les appels API et contourner les restrictions CORS.
//     Ok("{}".to_string())
// }
