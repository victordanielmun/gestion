# Flujo de Trabajo del Sistema de Inventario y Ventas

Este documento describe el flujo de trabajo esperado para los usuarios que interactúan con el sistema de Inventario y Ventas.

## 1. Inicialización y Autenticación

El sistema se inicializa automáticamente (vía Docker) con datos de prueba (dummy data) para facilitar el primer ingreso.

- **Usuario Admin Inicial:**
  - **Email:** `admin@empresa.com`
  - **Contraseña:** `admin123`

### Autenticación (Login)
Al ingresar al frontend (React), el usuario es redirigido a la pantalla de `/login`. Ingresa las credenciales y el Backend (Go) retorna un JWT válido por 24h. Este token se guarda en `localStorage` y se adjunta mediante Axios Interceptors a cada petición posterior.

---

## 2. Configuración Inicial del Sistema (Admin)

Una vez logueado como administrador, se recomienda seguir estos pasos:

1. **Configuración de Empresa:**
   El administrador puede modificar el Nombre, RUT, y subir el logo en la sección de configuración (almacenado en `company_settings`).
2. **Crear Almacenes/Locales:**
   El sistema ya posee un "Local Principal". El admin puede añadir otros si el negocio lo requiere.
3. **Crear Usuarios y Asignar Roles:**
   Existen roles base (`admin`, `vendedor`, `bodeguero`, `contador`). El admin puede registrar nuevos empleados (`/users`) y asignarles estos roles.

---

## 3. Catálogo e Inventario

Para vender un producto, primero debe existir en el catálogo y tener stock en un almacén.

1. **Creación de Producto:**
   Se ingresa a la vista "Productos" y se registra el producto (Referencia, nombre, precio de compra, precio de venta, % IVA).
2. **Registro de Stock (Inventario):**
   Automáticamente al registrar compras o manualmente (si está habilitado), el stock en la tabla `inventory` se incrementa para un Almacén específico. Los movimientos se auditan en `inventory_movements`.

---

## 4. Proceso de Venta

El "Vendedor" atiende al cliente final:

1. **Selección de Cliente:**
   Se busca un cliente existente en base de datos o se selecciona el cliente genérico "Consumidor Final" (ya pre-cargado).
2. **Generación de la Venta (`/sales`):**
   - El sistema lista los productos.
   - El vendedor selecciona la cantidad deseada.
   - El frontend calcula `Subtotal`, `IVA`, y `Total`.
3. **Registro en Backend:**
   Al enviar el POST a `/sales`:
   - Se crea el registro principal en `sales`.
   - Se insertan los productos vendidos en `sale_items`.
   - **Trigger/Servicio Automático:** El sistema descuenta el stock en el almacén seleccionado (`inventory`) y genera un registro de auditoría en `inventory_movements` con el tipo `SALE`.
4. **Exportar Factura (PDF):**
   El sistema provee el endpoint `GET /sales/{id}/pdf`.
   Se genera en el vuelo un PDF con los datos de la empresa (logo, RUT), datos del cliente y el detalle de lo comprado, devolviendo el archivo para su impresión o descarga.

---

## 5. Cierre de Sesión

Al terminar la jornada, el usuario selecciona "Cerrar sesión". Esto destruye el token local y redirige al `/login`.
