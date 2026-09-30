//! Núcleo do FL Hub: instala pacotes (.flpack) de predefinições do CapCut no Mac e no Windows.
pub mod env;
pub mod fonts;
pub mod index;
pub mod install;
pub mod pack;
pub mod patch;

pub use env::{Env, Target};
pub use install::{diagnose, install, installed, uninstall, Installed, Report};
pub use pack::Pack;
