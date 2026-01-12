-- Carp Club ČR - Add hlavni_admin enum value
-- Migration: 005a_add_hlavni_admin_enum
-- Description: Adds hlavni_admin value to user_role enum
--
-- DŮLEŽITÉ: Tato migrace MUSÍ být spuštěna a COMMITNUTA PŘED migrací 005b!
-- PostgreSQL vyžaduje, aby nové hodnoty enumu byly commitnuty
-- před jejich použitím v RLS politikách.

-- Přidat hodnotu hlavni_admin do enumu user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hlavni_admin';
