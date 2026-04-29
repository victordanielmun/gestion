# Sistema de Inventario y Ventas

Repositorio fullstack para la gestión de inventario y facturación (Colombia).
Contiene un frontend en React (Vite, TS, Tailwind) y un backend en Go (Chi, sqlx).

## Inicio Rápido (Docker)

1. En la raíz del repositorio, ejecuta:
   ```bash
   docker compose up -d --build
   ```
2. Espera a que la base de datos se inicialice.
3. El frontend estará disponible en `http://localhost:5173`.
4. El backend estará disponible en `http://localhost:8080`.

**Credenciales de Admin Iniciales:**
- **Email:** admin@empresa.com
- **Clave:** admin123

## Documentación
- [Flujo de Trabajo](docs/WORKFLOW.md)
