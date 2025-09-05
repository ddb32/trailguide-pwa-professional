
המסמך הבא, משלב את מודל הנתונים ומפרט ה-API, יכול להיקרא "אפיון טכני" (Technical Specification) או "מפרט Backend" (Backend Specification). השם הראשון נפוץ יותר ומקיף את כל ההיבטים הטכניים שהגדרנו.
אני מציג לך אותו עכשיו בפורמט מסודר.
אפיון טכני: מודל נתונים ומפרט API
1. מודל נתונים (ERD)
מודל הנתונים מתאר את המבנה והיחסים בין הנתונים באפליקציה. הוא מהווה את השלד של מסד הנתונים.
 * טבלת Users (משתמשים)
   * id (UUID) - מזהה ייחודי למשתמש.
   * username (String) - שם המשתמש להתחברות.
   * password_hash (String) - סיסמה מוצפנת.
   * created_at (Timestamp) - תאריך יצירת המשתמש.
 * טבלת Events (אירועים)
   * id (UUID) - מזהה ייחודי לאירוע/הכוונה.
   * organizer_id (UUID) - מפתח זר המקשר למשתמש שיצר את האירוע.
   * event_name (String) - שם האירוע.
   * status (Enum: 'draft', 'published', 'expired') - מצב ההכוונה.
   * expiration_date (Timestamp) - תאריך ושעת תפוגה.
   * clicks_count (Integer, Default: 0) - סופר כמה פעמים הקישור הציבורי נפתח.
   * created_at (Timestamp) - תאריך יצירת ההכוונה.
   * updated_at (Timestamp) - תאריך עדכון אחרון.
 * טבלת Steps (צעדים)
   * id (UUID) - מזהה ייחודי לצעד.
   * event_id (UUID) - מפתח זר המקשר לאירוע שהצעד שייך אליו.
   * step_order (Integer) - סדר הצעד ברצף.
   * image_url (String) - הכתובת לאחסון התמונה.
   * description (String) - הטקסט הנלווה לצעד (עד 200 תווים).
2. מפרט API
זהו המפרט שינחה את מפתחי ה-Backend בבניית השרת, ואת מפתחי ה-Frontend בבניית הצד הלקוח.
 * 1. התחברות (Login)
   * פעולה: POST
   * נתיב (Endpoint): /api/v1/login
   * נתונים נשלחים (Request Body): { "username": "string", "password": "string" }
   * תגובה מוצלחת (200 OK): { "message": "Login successful", "token": "jwt_token_here" }
   * תגובת שגיאה (401 Unauthorized): { "error": "Invalid username or password" }
 * 2. קבלת רשימת הכוונות
   * פעולה: GET
   * נתיב: /api/v1/events
   * אימות (Authentication): דורש Authorization Token.
   * תגובה מוצלחת (200 OK):
     [
  {
    "id": "uuid", "event_name": "string", "status": "string",
    "expiration_date": "timestamp", "steps_count": "integer",
    "clicks_count": "integer", "created_at": "timestamp"
  }
]

 * 3. יצירת הכוונה חדשה
   * פעולה: POST
   * נתיב: /api/v1/events
   * אימות: דורש Authorization Token.
   * נתונים נשלחים: { "event_name": "string", "expiration_date": "timestamp" }
   * תגובה מוצלחת (201 Created): { "message": "Event created successfully", "event_id": "uuid" }
 * 4. קבלת פרטי הכוונה ספציפית
   * פעולה: GET
   * נתיב: /api/v1/events/:id
   * אימות: דורש Authorization Token.
   * תגובה מוצלחת (200 OK):
     {
  "id": "uuid", "event_name": "string", "status": "string", "expiration_date": "timestamp",
  "steps": [
    { "id": "uuid", "step_order": "integer", "image_url": "string", "description": "string" }
  ]
}

 * 5. יצירת צעד חדש
   * פעולה: POST
   * נתיב: /api/v1/events/:id/steps
   * אימות: דורש Authorization Token.
   * נתונים נשלחים: { "step_order": "integer", "image_url": "string", "description": "string" }
   * תגובה מוצלחת (201 Created): { "message": "Step added successfully", "step_id": "uuid" }
 * 6. עדכון צעד קיים
   * פעולה: PUT
   * נתיב: /api/v1/steps/:step_id
   * אימות: דורש Authorization Token.
   * נתונים נשלחים: { "step_order": "integer", "description": "string" }
   * תגובה מוצלחת (200 OK): { "message": "Step updated successfully" }
 * 7. מחיקת צעד
   * פעולה: DELETE
   * נתיב: /api/v1/steps/:step_id
   * אימות: דורש Authorization Token.
   * תגובה מוצלחת (200 OK): { "message": "Step deleted successfully" }
 * 8. קבלת הכוונה לבליין (גישה ציבורית)
   * פעולה: GET
   * נתיב: /api/v1/public/events/:id
   * אימות: ללא.
   * תגובה מוצלחת (200 OK):
     {
  "event_name": "string",
  "steps": [
    { "image_url": "string", "description": "string" }
  ]
}

   * תגובת שגיאה (404 Not Found): אם הקישור לא קיים או פג תוקף.
# מעמד מימוש נוכחי (Implementation Status) - עדכון: ספטמבר 2025

## מודל הנתונים - מעמד הטמעה

### ✅ **הושלם** (Implemented)
* **טבלת Users** - מיושמת במלואה
  * תמיכה ב-UUID כמזהה ראשי
  * הצפנת סיסמאות עם bcrypt
  * משתמשי דמו נוצרו לבדיקות
  * תמיכה בשדות נוספים: email, full_name

### ❌ **בהמתנה** (Pending Implementation)
* **טבלת Events** - טרם יושמה
* **טבלת Steps** - טרם יושמה
* **תמיכה באנליטיקס מתקדמת** - טרם יושמה

## API Endpoints - מעמד הטמעה

### ✅ **מיושם ופועל** (Fully Implemented)
* **אימות משתמשים**:
  * `POST /api/v1/auth/login` - התחברות משתמש ✅
  * `POST /api/v1/auth/logout` - התנתקות משתמש ✅
  * `GET /api/v1/auth/me` - פרטי משתמש מחובר ✅
* **נקודות מידע**:
  * `GET /api/v1/health` - בדיקת בריאות מערכת ✅
  * `GET /api/v1/info` - מידע על API ✅
  * `GET /api/v1/welcome` - הודעת ברוכים הבאים (עם תמיכה בעברית) ✅

### ❌ **טרם מיושם** (Not Yet Implemented)
* **ניהול אירועים/הכוונות**:
  * `GET /api/v1/events` - קבלת רשימת הכוונות
  * `POST /api/v1/events` - יצירת הכוונה חדשה
  * `GET /api/v1/events/:id` - קבלת פרטי הכוונה
  * `PUT /api/v1/events/:id` - עדכון הכוונה
  * `DELETE /api/v1/events/:id` - מחיקת הכוונה
* **ניהול צעדים**:
  * `POST /api/v1/events/:id/steps` - יצירת צעד חדש
  * `PUT /api/v1/steps/:step_id` - עדכון צעד
  * `DELETE /api/v1/steps/:step_id` - מחיקת צעד
* **גישה ציבורית**:
  * `GET /api/v1/public/events/:id` - צפייה ציבורית בהכוונה
* **העלאת קבצים**:
  * `POST /api/v1/upload` - העלאת תמונות

## תכונות אבטחה מיושמות

### ✅ **הושלם**
* הצפנת סיסמאות עם bcrypt (12 rounds)
* JWT tokens עם אימות מאובטח
* HTTPS enforcement (הכנות לפרודקשן)
* Rate limiting על נקודות התחברות
* CORS configuration
* Security headers (helmet.js)

### ❌ **טרם מיושם**
* Refresh token mechanism
* Session management מתקדם
* File upload validation
* Input sanitization לצעדים

## תמיכה בעברית ו-RTL

### ✅ **הושלם**
* תמיכה מלאה בעברית בצד הלקוח (Frontend)
* קבצי תרגום מלאים (he.json, en.json)
* RTL CSS utilities מיושמים
* מערכת הכוונה אוטומטית לכיוון טקסט
* תמיכה בעברית ב-API responses

## איך לבדוק את המימוש הנוכחי

### בדיקת מערכת האימות
```bash
# בדיקת התחברות
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# בדיקת בריאות מערכת
curl http://localhost:3000/api/v1/health
```

### משתמשי דמו זמינים
* **משתמש 1**: email: `demo@example.com`, password: `demo123`
* **משתמש 2**: email: `organizer@test.com`, password: `test123`

### בדיקת ממשק משתמש
1. גש ל-http://localhost:5173
2. לחץ על "התחל עכשיו" או עבור ל-/login
3. השתמש באחד ממשתמשי הדמו
4. בדוק את הפונקציות הזמינות בדאשבורד

## הערות למפתח

### מוכן לפיתוח נוסף
המערכת כוללת תשתית יציבה ומקצועית שמאפשרת פיתוח מהיר של התכונות החסרות. האימות פועל במלואו, הממשק מקצועי ותומך בעברית, והארכיטקטורה מוכנה לתכונות נוספות.

### שלבים הבאים בפיתוח
1. **הרחבת סכמת מסד הנתונים** - הוספת טבלאות events ו-steps
2. **מימוש API לניהול הכוונות** - CRUD operations
3. **חיבור הממשק לנתונים אמיתיים** - החלפת mock data
4. **מימוש העלאת תמונות** - אינטגרציה עם AWS S3
5. **פיתוח ממשק צרכן סופי** - דף צפייה בהכוונות

האם תרצה שנתקדם למסמך הבא, שיתאר דרישות לא-פונקציונליות (NFR), או שיש משהו שתרצה להוסיף או לשנות במפרט הזה?

