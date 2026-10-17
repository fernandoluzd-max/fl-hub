//! Núcleo do FL Hub: instala pacotes (.flpack) de predefinições do CapCut no Mac e no Windows.
pub mod env;
pub mod fonts;
pub mod index;
pub mod install;
pub mod pack;
pub mod patch;
pub mod projetos;

pub use env::{Env, Target};
pub use install::{diagnose, install, installed, uninstall, Installed, Report};
pub use pack::Pack;
pub use projetos::{reparar as reparar_projetos, verificar as verificar_projetos, Reparo, Verificacao};
