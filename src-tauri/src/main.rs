// Empêche une fenêtre console supplémentaire sur Windows en release.
// NE PAS SUPPRIMER.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    prisme_lib::run()
}
