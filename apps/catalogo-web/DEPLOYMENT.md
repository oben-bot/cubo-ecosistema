# 🚀 Guía de Despliegue - Gestor de Catálogos

## 📋 Opciones de Despliegue

### Opción 1: Vercel (Básico - Solo localStorage)

**Pros:**

- ✅ Despliegue en 2 minutos
- ✅ Gratis hasta 100GB de ancho de banda
- ✅ HTTPS automático
- ✅ Dominio personalizado

**Contras:**

- ❌ Datos se pierden al limpiar navegador
- ❌ Límite de tamaño de imágenes (4.5MB)

**Pasos:**

1. Conecta tu repo a Vercel
2. Deploy automático
3. ¡Listo!

---

### Opción 2: Vercel + Cloudinary (Recomendado)

**Pros:**

- ✅ Imágenes optimizadas automáticamente
- ✅ CDN global para imágenes
- ✅ Sin límites de tamaño
- ✅ Transformaciones automáticas
- ✅ Backup automático de imágenes

**Pasos:**

#### 1. Configurar Cloudinary

```bash
# 1. Crear cuenta en cloudinary.com (gratis)
# 2. Obtener credenciales del dashboard
# 3. Crear archivo .env.local
```

#### 2. Variables de entorno

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

#### 3. Desplegar en Vercel

```bash
# 1. Conectar repo a Vercel
# 2. Agregar variables de entorno en Vercel
# 3. Deploy automático
```

---

### Opción 3: Vercel + Cloudinary + Base de Datos (Profesional)

**Para cuando tengas muchos clientes:**

#### Base de datos recomendadas:

- **Supabase** (PostgreSQL gratis)
- **PlanetScale** (MySQL gratis)
- **MongoDB Atlas** (NoSQL gratis)

#### Pasos adicionales:

1. Crear base de datos
2. Instalar Prisma: `npm install prisma @prisma/client`
3. Configurar esquemas
4. Migrar localStorage a DB

---

## 🛠️ Despliegue Súper Fácil en Vercel

### Opción A: Solo con localStorage (2 minutos)

```bash
# 1. Sube tu código a GitHub
git add .
git commit -m "Ready to deploy"
git push origin main

# 2. Ve a vercel.com
# 3. Conecta tu repo
# 4. Click "Deploy"
# 5. ¡Listo! 🎉
```

### Opción B: Con Cloudinary para imágenes (5 minutos)

#### 1. Configurar Cloudinary

1. Crea cuenta gratis en [cloudinary.com](https://cloudinary.com)
2. Copia tus credenciales del dashboard

#### 2. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu repositorio GitHub
3. En "Environment Variables" agrega:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = tu-cloud-name
   CLOUDINARY_API_KEY = tu-api-key
   CLOUDINARY_API_SECRET = tu-api-secret
   ```
4. Click "Deploy"
5. ¡Listo con imágenes en la nube! 🎉

#### 3. Dominio personalizado (opcional)

1. Vercel → Settings → Domains
2. Agregar tu dominio (ej: `catalogo.tuempresa.com`)
3. Configurar DNS según instrucciones

---

## 💰 Costos Estimados

### Cloudinary (Imágenes)

- **Gratis**: 25GB almacenamiento + 25GB ancho de banda
- **Pagado**: $89/mes para uso comercial

### Vercel (Hosting)

- **Gratis**: 100GB ancho de banda
- **Pro**: $20/mes para uso comercial

### Base de datos (opcional)

- **Supabase**: Gratis hasta 500MB
- **PlanetScale**: Gratis hasta 5GB

**Total mensual estimado: $0-109 dependiendo del uso**

---

## � CFlujo Diario (Súper Simple)

```bash
# Haces cambios en tu código
git add .
git commit -m "Nuevas mejoras"
git push origin main

# Vercel automáticamente:
# ✅ Detecta el cambio
# ✅ Hace build
# ✅ Despliega
# ✅ Te notifica
# ¡Live en 2-3 minutos! 🚀
```

## 🔧 Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Verificar que compila antes de push
npm run build
```

---

## 📊 Monitoreo y Analytics

### Métricas importantes:

- Número de catálogos creados
- Imágenes subidas por mes
- Ancho de banda usado
- Tiempo de carga de catálogos

### Herramientas recomendadas:

- **Vercel Analytics** (gratis)
- **Google Analytics** (gratis)
- **Cloudinary Analytics** (incluido)

---

## 🚨 Consideraciones de Seguridad

### Variables de entorno:

- ✅ Nunca commitear `.env.local`
- ✅ Usar variables de entorno en producción
- ✅ Rotar API keys periódicamente

### Imágenes:

- ✅ Validar tipos de archivo
- ✅ Limitar tamaño de subida
- ✅ Sanitizar nombres de archivo

### Rate limiting:

- ✅ Implementar límites de subida
- ✅ Proteger APIs con throttling

---

## 🎯 Próximos Pasos

1. **Fase 1**: Deploy básico con Cloudinary
2. **Fase 2**: Agregar base de datos
3. **Fase 3**: Sistema de usuarios/autenticación
4. **Fase 4**: Panel de analytics
5. **Fase 5**: API para integraciones

---

## 📞 Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs de Vercel
2. Verifica variables de entorno
3. Checa la documentación de Cloudinary
4. Contacta soporte si es necesario
