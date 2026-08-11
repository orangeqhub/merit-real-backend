# Merit API — Architecture Foundation

## Dynamic data policy

- **No demo seed users** (customer/agent hardcoded accounts removed)
- **No hardcoded agent categories** — stored in `AgentCategories`, managed via API
- **Admin** — created once from `ADMIN_*` env vars if the table has no admin
- Reference data (categories, later property types, etc.) is always DB-backed

## Layers

```
Routes → Middleware → Validations → Controllers → Services → Models
```

## Database

- `config/database.js` + `.env`
- `models/index.js` — single Sequelize instance, auto-load models
- Migrations only — never `sequelize.sync()`
- `npm run setup` = create DB + migrate (seed optional / empty by default)

## Startup

1. HTTP listen  
2. `sequelize.authenticate()`  
3. `ensureDefaultAdmin()` from env  
4. Mark ready  

## Route groups

```
/api/auth
/api/agent-categories
/api/customer
/api/agent
```
