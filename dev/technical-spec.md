
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
האם תרצה שנתקדם למסמך הבא, שיתאר דרישות לא-פונקציונליות (NFR), או שיש משהו שתרצה להוסיף או לשנות במפרט הזה?

