#!/bin/bash

# Stop on error
set -e

echo "🚀 Starting Enterprise Refactor..."

# 1. Create Directory Structure
echo "📂 Creating folders..."
mkdir -p src/services/{business,integration}
mkdir -p src/routes/v1/{admin,franchise,user,public}
mkdir -p src/middlewares/{auth,validation,upload,error}
mkdir -p src/config
mkdir -p src/templates
mkdir -p src/controllers/user # Ensure exists

# 2. Move Utils to Config
echo "⚙️ Moving Configs..."
if [ -f src/utils/cloudinary.js ]; then
    mv src/utils/cloudinary.js src/config/
fi

# 3. Move Services
echo "💼 Moving Services..."
# Business Logic
mv src/services/sales.util.js src/services/business/sales.service.js 2>/dev/null || true
for file in bonus cron matching mlm payout rank user; do
    if [ -f src/services/${file}.service.js ]; then
        mv src/services/${file}.service.js src/services/business/
    fi
done

# Integration Logic
for file in email pdf vendorId cloudinary mail; do
    if [ -f src/services/${file}.service.js ]; then
        mv src/services/${file}.service.js src/services/integration/
    fi
done

# Helpers
if [ -f src/services/emailTemplates.js ]; then
    mv src/services/emailTemplates.js src/templates/emailTemplates.js
fi

# 4. Move Middlewares
echo "🛡️ Moving Middlewares..."
mv src/middlewares/authMiddleware.js src/middlewares/auth/ 2>/dev/null || true
mv src/middlewares/adminMiddleware.js src/middlewares/auth/ 2>/dev/null || true
mv src/middlewares/franchiseAuthMiddleware.js src/middlewares/auth/ 2>/dev/null || true
mv src/middlewares/franchiseValidation.js src/middlewares/validation/ 2>/dev/null || true
mv src/middlewares/productValidation.js src/middlewares/validation/ 2>/dev/null || true
mv src/middlewares/cloudinaryUpload.js src/middlewares/upload/ 2>/dev/null || true
mv src/middlewares/uploadMiddleware.js src/middlewares/upload/ 2>/dev/null || true
mv src/middlewares/errorHandler.js src/middlewares/error/ 2>/dev/null || true

# 5. Move Routes & Organize V1
echo "🌐 Organizing Routes..."
# Admin
mv src/routes/admin/* src/routes/v1/admin/ 2>/dev/null || true
# Admin Base Routes (adminRoutes.js map to index?)
if [ -f src/routes/adminRoutes.js ]; then
    mv src/routes/adminRoutes.js src/routes/v1/admin/index.js
fi

# Franchise
mv src/routes/franchise/* src/routes/v1/franchise/ 2>/dev/null || true
if [ -f src/routes/franchiseRoutes.js ]; then
    mv src/routes/franchiseRoutes.js src/routes/v1/franchise/index.js
fi

# User
if [ -f src/routes/userRoutes.js ]; then
    mv src/routes/userRoutes.js src/routes/v1/user/index.js
fi

# Public / Auth
if [ -f src/routes/authRoutes.js ]; then
    mv src/routes/authRoutes.js src/routes/v1/public/auth.routes.js
fi
if [ -f src/routes/productRoutes.js ]; then
    mv src/routes/productRoutes.js src/routes/v1/public/product.routes.js
fi

# 6. Update Imports (Deepening Paths)
echo "🔗 Updating Imports..."

# Function to update depths
deepen_imports() {
    local dir=$1
    # Replace '../' with '../../'
    find "$dir" -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
    # Replace '../../' with '../../../' (if previously 2 levels)
    # Note: The above command might create from '../../' if it matched. 
    # To avoid double replacement, use a temporary marker or careful ordering.
    # Actually, simpler: 
    # If I replace '../' with '../../', then '../../' becomes '../../../' automatically? No.
    # '../' matches start of path.
    # We should handle specific path prefixes.
}

# Apply deepening for moved folders
# Services (depth +1)
find src/services/business -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
find src/services/integration -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"

# Middlewares (depth +1)
find src/middlewares/auth -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
find src/middlewares/validation -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
find src/middlewares/upload -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
find src/middlewares/error -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"

# Routes (depth +1 relative to old 'routes/')
# But admin/ was already depth 2. Now v1/admin/ is depth 3. (+1)
find src/routes/v1/admin -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
find src/routes/v1/franchise -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../|g"
# User routes moved from routes/ -> routes/v1/user/ (+2 levels!)
find src/routes/v1/user -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../../|g"
# Public routes moved from routes/ -> routes/v1/public/ (+2 levels!)
find src/routes/v1/public -name "*.js" -print0 | xargs -0 sed -i "s|from '\.\./|from '../../../|g"


# 7. Update Specific References Globaly
# Fix references TO moved files
grep -rIl "sales.util.js" src | xargs sed -i 's|services/sales.util.js|services/business/sales.service.js|g'
grep -rIl "email.service.js" src | xargs sed -i 's|services/email.service.js|services/integration/email.service.js|g'
grep -rIl "pdf.service.js" src | xargs sed -i 's|services/pdf.service.js|services/integration/pdf.service.js|g'
grep -rIl "vendorId.service.js" src | xargs sed -i 's|services/vendorId.service.js|services/integration/vendorId.service.js|g'

grep -rIl "authMiddleware.js" src | xargs sed -i 's|middlewares/authMiddleware.js|middlewares/auth/authMiddleware.js|g'
grep -rIl "adminMiddleware.js" src | xargs sed -i 's|middlewares/adminMiddleware.js|middlewares/auth/adminMiddleware.js|g'
grep -rIl "franchiseAuthMiddleware.js" src | xargs sed -i 's|middlewares/franchiseAuthMiddleware.js|middlewares/auth/franchiseAuthMiddleware.js|g'
grep -rIl "franchiseValidation.js" src | xargs sed -i 's|middlewares/franchiseValidation.js|middlewares/validation/franchiseValidation.js|g'
grep -rIl "productValidation.js" src | xargs sed -i 's|middlewares/productValidation.js|middlewares/validation/productValidation.js|g'
grep -rIl "uploadMiddleware.js" src | xargs sed -i 's|middlewares/uploadMiddleware.js|middlewares/upload/uploadMiddleware.js|g'
grep -rIl "errorHandler.js" src | xargs sed -i 's|middlewares/errorHandler.js|middlewares/error/errorHandler.js|g'

# Cloudinary Config
grep -rIl "utils/cloudinary.js" src | xargs sed -i 's|utils/cloudinary.js|config/cloudinary.js|g'

echo "✅ Refactor Complete. Manual check required for app.js and routes."
