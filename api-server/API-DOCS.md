# API Server - API Documentation

Complete reference for the Fastify-based Profile and Resume Template APIs.

## Base URL

**Development**: `http://localhost:3002`  
**Production**: `https://api-server-xxxxx-uc.a.run.app` (Cloud Run URL)

## Interactive API Documentation

Swagger UI is available at:
```
http://localhost:3002/documentation
```

The interactive explorer allows you to:
- View all endpoints with request/response schemas
- Test endpoints directly in the browser
- See authentication requirements
- View example requests and responses

## Authentication

All endpoints (except `/health`) require JWT authentication via the `Authorization` header:

```bash
Authorization: Bearer <jwt_token>
```

**Example**:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:3002/api/profile/1
```

### JWT Token Structure

Tokens must contain a `sub` (subject) claim with the user ID:

```json
{
  "sub": "user-123",
  "iat": 1234567890,
  "exp": 1234671490
}
```

## Endpoints

### Health Check (No Auth)

#### `GET /health`

Check service health and readiness.

**Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-06-13T22:30:00Z"
}
```

### Profile Endpoints

#### `POST /api/profile`

Create a new profile.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "location": "San Francisco, CA",
  "bio": "Senior Software Engineer",
  "resume": null,
  "metadata": {}
}
```

**Response**: `201 Created`
```json
{
  "id": "profile-123",
  "userId": "user-456",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "location": "San Francisco, CA",
  "bio": "Senior Software Engineer",
  "resume": null,
  "metadata": {},
  "createdAt": "2024-06-13T22:30:00Z",
  "updatedAt": "2024-06-13T22:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `409 Conflict`: Profile already exists for user

---

#### `GET /api/profile/:id`

Retrieve a profile by ID. Users can only access their own profiles.

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `id` (string): Profile ID

**Response**: `200 OK`
```json
{
  "id": "profile-123",
  "userId": "user-456",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "location": "San Francisco, CA",
  "bio": "Senior Software Engineer",
  "resume": null,
  "metadata": {},
  "createdAt": "2024-06-13T22:30:00Z",
  "updatedAt": "2024-06-13T22:30:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Access denied (profile belongs to different user)
- `404 Not Found`: Profile not found

---

#### `PUT /api/profile/:id`

Update entire profile (replace all fields).

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `id` (string): Profile ID

**Request Body**: (all fields required)
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1-555-0101",
  "location": "Los Angeles, CA",
  "bio": "Staff Engineer",
  "resume": null,
  "metadata": {}
}
```

**Response**: `200 OK` (updated profile)

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Profile not found

---

#### `PATCH /api/profile/:id`

Partially update profile (update only provided fields).

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `id` (string): Profile ID

**Request Body**: (optional fields)
```json
{
  "name": "Jane Doe",
  "bio": "Staff Engineer"
}
```

**Response**: `200 OK` (updated profile)

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Profile not found

---

#### `DELETE /api/profile/:id`

Delete a profile.

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `id` (string): Profile ID

**Response**: `204 No Content`

**Errors**:
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Profile not found

---

#### `GET /api/profile`

List all profiles for the authenticated user.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters** (optional):
- `limit` (number): Results per page, default 10, max 100
- `offset` (number): Pagination offset, default 0

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "profile-123",
      "userId": "user-456",
      "name": "John Doe",
      ...
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Resume Template Endpoints

#### `POST /api/resume-templates`

Create a new resume template.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Software Engineer Resume",
  "description": "Main resume for tech interviews",
  "content": "# John Doe\n\nSenior Software Engineer...",
  "templateType": "MARKDOWN"
}
```

**Response**: `201 Created`
```json
{
  "id": "template-123",
  "userId": "user-456",
  "name": "Software Engineer Resume",
  "description": "Main resume for tech interviews",
  "content": "# John Doe\n...",
  "templateType": "MARKDOWN",
  "createdAt": "2024-06-13T22:30:00Z",
  "updatedAt": "2024-06-13T22:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token

---

#### `GET /api/resume-templates/:id`

Retrieve a resume template by ID. Users can only access their own templates.

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `id` (string): Template ID

**Response**: `200 OK`

**Errors**:
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Template not found

---

#### `PUT /api/resume-templates/:id`

Update entire resume template.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: (all fields required)
```json
{
  "name": "Updated Resume",
  "description": "Updated description",
  "content": "# Updated Content...",
  "templateType": "MARKDOWN"
}
```

**Response**: `200 OK` (updated template)

---

#### `PATCH /api/resume-templates/:id`

Partially update resume template.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: (optional fields)
```json
{
  "name": "Updated Resume",
  "content": "# Updated Content..."
}
```

**Response**: `200 OK`

---

#### `DELETE /api/resume-templates/:id`

Delete a resume template.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**: `204 No Content`

---

#### `GET /api/resume-templates`

List all resume templates for the authenticated user.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters** (optional):
- `limit` (number): Results per page, default 10
- `offset` (number): Pagination offset, default 0

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "template-123",
      ...
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed: email is invalid"
}
```

### Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input validation |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Access denied (not your resource) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Database connection issue |

## Rate Limiting

Currently no rate limiting is applied. For production deployments with heavy traffic, consider:
- Adding Cloud Run traffic management
- Implementing API Gateway with rate limiting
- Caching frequently accessed profiles

## CORS

CORS is enabled for the following origins in production:
- Frontend application URL
- Custom domain (if configured)

To allow additional origins, update CORS configuration in `src/middleware/cors.ts`.

## Testing

### Using cURL

```bash
# Get JWT token (from frontend/auth service)
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Create profile
curl -X POST http://localhost:3002/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA",
    "bio": "Senior Software Engineer"
  }'

# Get profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3002/api/profile/profile-123

# Update profile
curl -X PATCH http://localhost:3002/api/profile/profile-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio": "Staff Engineer"}'

# List profiles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3002/api/profile
```

### Using Postman

1. Open Postman
2. Set base URL to `http://localhost:3002`
3. Add Authorization header with Bearer token
4. Import endpoints from Swagger spec: `GET http://localhost:3002/documentation.json`

## OpenAPI Specification

The complete OpenAPI 3.0 spec is available at:
```
http://localhost:3002/documentation.json
```

Use this to:
- Generate client SDKs
- Validate requests/responses
- Document in external tools
