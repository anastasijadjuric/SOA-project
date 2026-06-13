package main

import (
	"context"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	db        *mongo.Database
	jwtSecret = []byte("soa_secret_2025")
)

// ===== MODELS =====

type Tour struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	AuthorID    string             `bson:"authorId" json:"authorId"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Difficulty  string             `bson:"difficulty" json:"difficulty"`
	Tags        []string           `bson:"tags" json:"tags"`
	Status      string             `bson:"status" json:"status"`
	Price       float64            `bson:"price" json:"price"`
	Length      float64            `bson:"length" json:"length"`
	PublishedAt *time.Time         `bson:"publishedAt,omitempty" json:"publishedAt,omitempty"`
	ArchivedAt  *time.Time         `bson:"archivedAt,omitempty" json:"archivedAt,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

type KeyPoint struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TourID      string             `bson:"tourId" json:"tourId"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Lat         float64            `bson:"lat" json:"lat"`
	Long        float64            `bson:"long" json:"long"`
	Image       string             `bson:"image,omitempty" json:"image,omitempty"`
	Order       int                `bson:"order" json:"order"`
}

type Position struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TouristID string             `bson:"touristId" json:"touristId"`
	Lat       float64            `bson:"lat" json:"lat"`
	Long      float64            `bson:"long" json:"long"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type OrderItem struct {
	TourID   string  `bson:"tourId" json:"tourId"`
	TourName string  `bson:"tourName" json:"tourName"`
	Price    float64 `bson:"price" json:"price"`
}

type ShoppingCart struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TouristID  string             `bson:"touristId" json:"touristId"`
	Items      []OrderItem        `bson:"items" json:"items"`
	TotalPrice float64            `bson:"totalPrice" json:"totalPrice"`
}

type TourPurchaseToken struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TouristID   string             `bson:"touristId" json:"touristId"`
	TourID      string             `bson:"tourId" json:"tourId"`
	PurchasedAt time.Time          `bson:"purchasedAt" json:"purchasedAt"`
}

type CompletedKeyPoint struct {
	KeyPointID  string    `bson:"keyPointId" json:"keyPointId"`
	CompletedAt time.Time `bson:"completedAt" json:"completedAt"`
}

type TourExecution struct {
	ID                 primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	TouristID          string              `bson:"touristId" json:"touristId"`
	TourID             string              `bson:"tourId" json:"tourId"`
	Status             string              `bson:"status" json:"status"`
	StartedAt          time.Time           `bson:"startedAt" json:"startedAt"`
	EndedAt            *time.Time          `bson:"endedAt,omitempty" json:"endedAt,omitempty"`
	LastActivity       time.Time           `bson:"lastActivity" json:"lastActivity"`
	StartLat           float64             `bson:"startLat" json:"startLat"`
	StartLong          float64             `bson:"startLong" json:"startLong"`
	CompletedKeyPoints []CompletedKeyPoint `bson:"completedKeyPoints" json:"completedKeyPoints"`
}

type Claims struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// ===== MIDDLEWARE =====

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization,Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if len(header) < 8 {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "No token"})
			c.Abort()
			return
		}
		tokenStr := header[7:]
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token"})
			c.Abort()
			return
		}
		c.Set("userId", claims.ID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// ===== HELPERS =====

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

func ctx() context.Context {
	c, _ := context.WithTimeout(context.Background(), 10*time.Second)
	return c
}

func updateTourLength(tourId string) {
	cur, err := db.Collection("keypoints").Find(ctx(), bson.M{"tourId": tourId},
		options.Find().SetSort(bson.M{"order": 1}))
	if err != nil {
		return
	}
	var kps []KeyPoint
	cur.All(ctx(), &kps)
	if len(kps) < 2 {
		return
	}
	var total float64
	for i := 1; i < len(kps); i++ {
		total += haversine(kps[i-1].Lat, kps[i-1].Long, kps[i].Lat, kps[i].Long)
	}
	id, _ := primitive.ObjectIDFromHex(tourId)
	db.Collection("tours").UpdateOne(ctx(), bson.M{"_id": id}, bson.M{"$set": bson.M{"length": total}})
}

// ===== TOUR HANDLERS =====

func createTour(c *gin.Context) {
	var body struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		Tags        []string `json:"tags"`
		Price       float64  `json:"price"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if body.Tags == nil {
		body.Tags = []string{}
	}
	tour := Tour{
		ID:          primitive.NewObjectID(),
		AuthorID:    c.GetString("userId"),
		Name:        body.Name,
		Description: body.Description,
		Difficulty:  body.Difficulty,
		Tags:        body.Tags,
		Status:      "draft",
		Price:       body.Price,
		CreatedAt:   time.Now(),
	}
	_, err := db.Collection("tours").InsertOne(ctx(), tour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, tour)
}

func getTours(c *gin.Context) {
	role := c.GetString("role")
	var filter bson.M
	if role == "guide" {
		filter = bson.M{}
	} else {
		filter = bson.M{"status": "published"}
	}
	cur, err := db.Collection("tours").Find(ctx(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	var tours []Tour
	cur.All(ctx(), &tours)
	if tours == nil {
		tours = []Tour{}
	}
	c.JSON(http.StatusOK, tours)
}

func getMyTours(c *gin.Context) {
	userId := c.GetString("userId")
	cur, err := db.Collection("tours").Find(ctx(), bson.M{"authorId": userId})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	var tours []Tour
	cur.All(ctx(), &tours)
	if tours == nil {
		tours = []Tour{}
	}
	c.JSON(http.StatusOK, tours)
}

func getTour(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid ID"})
		return
	}
	var tour Tour
	if err := db.Collection("tours").FindOne(ctx(), bson.M{"_id": id}).Decode(&tour); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Tour not found"})
		return
	}
	c.JSON(http.StatusOK, tour)
}

func updateTour(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userId := c.GetString("userId")
	var body struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		Tags        []string `json:"tags"`
		Price       float64  `json:"price"`
	}
	c.ShouldBindJSON(&body)
	db.Collection("tours").UpdateOne(ctx(), bson.M{"_id": id, "authorId": userId},
		bson.M{"$set": bson.M{
			"name": body.Name, "description": body.Description,
			"difficulty": body.Difficulty, "tags": body.Tags, "price": body.Price,
		}})
	c.JSON(http.StatusOK, gin.H{"message": "Updated"})
}

func publishTour(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userId := c.GetString("userId")
	var tour Tour
	if err := db.Collection("tours").FindOne(ctx(), bson.M{"_id": id, "authorId": userId}).Decode(&tour); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Tour not found"})
		return
	}
	count, _ := db.Collection("keypoints").CountDocuments(ctx(), bson.M{"tourId": id.Hex()})
	if count < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Tour must have at least 2 key points"})
		return
	}
	if tour.Name == "" || tour.Description == "" || tour.Difficulty == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Tour must have name, description and difficulty"})
		return
	}
	now := time.Now()
	db.Collection("tours").UpdateOne(ctx(), bson.M{"_id": id},
		bson.M{"$set": bson.M{"status": "published", "publishedAt": now}})
	c.JSON(http.StatusOK, gin.H{"message": "Tour published"})
}

func archiveTour(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userId := c.GetString("userId")
	now := time.Now()
	db.Collection("tours").UpdateOne(ctx(), bson.M{"_id": id, "authorId": userId},
		bson.M{"$set": bson.M{"status": "archived", "archivedAt": now}})
	c.JSON(http.StatusOK, gin.H{"message": "Tour archived"})
}

func activateTour(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	userId := c.GetString("userId")
	db.Collection("tours").UpdateOne(ctx(), bson.M{"_id": id, "authorId": userId},
		bson.M{"$set": bson.M{"status": "published"}})
	c.JSON(http.StatusOK, gin.H{"message": "Tour activated"})
}

// ===== KEYPOINT HANDLERS =====

func addKeyPoint(c *gin.Context) {
	tourId := c.Param("id")
	var body struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Lat         float64 `json:"lat"`
		Long        float64 `json:"long"`
		Image       string  `json:"image"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	count, _ := db.Collection("keypoints").CountDocuments(ctx(), bson.M{"tourId": tourId})
	kp := KeyPoint{
		ID:          primitive.NewObjectID(),
		TourID:      tourId,
		Name:        body.Name,
		Description: body.Description,
		Lat:         body.Lat,
		Long:        body.Long,
		Image:       body.Image,
		Order:       int(count) + 1,
	}
	if _, err := db.Collection("keypoints").InsertOne(ctx(), kp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if count >= 1 {
		updateTourLength(tourId)
	}
	c.JSON(http.StatusCreated, kp)
}

func getKeyPoints(c *gin.Context) {
	tourId := c.Param("id")
	cur, err := db.Collection("keypoints").Find(ctx(), bson.M{"tourId": tourId},
		options.Find().SetSort(bson.M{"order": 1}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	var kps []KeyPoint
	cur.All(ctx(), &kps)
	if kps == nil {
		kps = []KeyPoint{}
	}
	c.JSON(http.StatusOK, kps)
}

func updateKeyPoint(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	var body struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Lat         float64 `json:"lat"`
		Long        float64 `json:"long"`
		Image       string  `json:"image"`
	}
	c.ShouldBindJSON(&body)
	var kp KeyPoint
	db.Collection("keypoints").FindOne(ctx(), bson.M{"_id": id}).Decode(&kp)
	db.Collection("keypoints").UpdateOne(ctx(), bson.M{"_id": id},
		bson.M{"$set": bson.M{
			"name": body.Name, "description": body.Description,
			"lat": body.Lat, "long": body.Long, "image": body.Image,
		}})
	updateTourLength(kp.TourID)
	c.JSON(http.StatusOK, gin.H{"message": "Updated"})
}

func deleteKeyPoint(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	var kp KeyPoint
	db.Collection("keypoints").FindOne(ctx(), bson.M{"_id": id}).Decode(&kp)
	db.Collection("keypoints").DeleteOne(ctx(), bson.M{"_id": id})
	updateTourLength(kp.TourID)
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// ===== POSITION HANDLERS =====

func setPosition(c *gin.Context) {
	touristId := c.GetString("userId")
	var body struct {
		Lat  float64 `json:"lat"`
		Long float64 `json:"long"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	opts := options.Update().SetUpsert(true)
	db.Collection("positions").UpdateOne(ctx(), bson.M{"touristId": touristId},
		bson.M{"$set": bson.M{"lat": body.Lat, "long": body.Long, "updatedAt": time.Now()}}, opts)
	c.JSON(http.StatusOK, gin.H{"lat": body.Lat, "long": body.Long})
}

func getPosition(c *gin.Context) {
	touristId := c.GetString("userId")
	var pos Position
	if err := db.Collection("positions").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&pos); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Position not set"})
		return
	}
	c.JSON(http.StatusOK, pos)
}

// ===== CART HANDLERS =====

func getCart(c *gin.Context) {
	touristId := c.GetString("userId")
	var cart ShoppingCart
	if err := db.Collection("carts").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&cart); err != nil {
		cart = ShoppingCart{TouristID: touristId, Items: []OrderItem{}, TotalPrice: 0}
	}
	if cart.Items == nil {
		cart.Items = []OrderItem{}
	}
	c.JSON(http.StatusOK, cart)
}

func addToCart(c *gin.Context) {
	touristId := c.GetString("userId")
	var body struct {
		TourID   string  `json:"tourId"`
		TourName string  `json:"tourName"`
		Price    float64 `json:"price"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	var cart ShoppingCart
	if err := db.Collection("carts").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&cart); err != nil {
		cart = ShoppingCart{ID: primitive.NewObjectID(), TouristID: touristId, Items: []OrderItem{}, TotalPrice: 0}
	}
	for _, item := range cart.Items {
		if item.TourID == body.TourID {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Tour already in cart"})
			return
		}
	}
	cart.Items = append(cart.Items, OrderItem{TourID: body.TourID, TourName: body.TourName, Price: body.Price})
	cart.TotalPrice += body.Price
	opts := options.Update().SetUpsert(true)
	db.Collection("carts").UpdateOne(ctx(), bson.M{"touristId": touristId},
		bson.M{"$set": bson.M{"items": cart.Items, "totalPrice": cart.TotalPrice}}, opts)
	c.JSON(http.StatusOK, cart)
}

func removeFromCart(c *gin.Context) {
	touristId := c.GetString("userId")
	tourId := c.Param("tourId")
	var cart ShoppingCart
	db.Collection("carts").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&cart)
	newItems := make([]OrderItem, 0)
	var total float64
	for _, item := range cart.Items {
		if item.TourID != tourId {
			newItems = append(newItems, item)
			total += item.Price
		}
	}
	db.Collection("carts").UpdateOne(ctx(), bson.M{"touristId": touristId},
		bson.M{"$set": bson.M{"items": newItems, "totalPrice": total}})
	c.JSON(http.StatusOK, gin.H{"message": "Removed from cart"})
}

func checkout(c *gin.Context) {
	touristId := c.GetString("userId")
	var cart ShoppingCart
	if err := db.Collection("carts").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&cart); err != nil || len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Cart is empty"})
		return
	}
	tokens := make([]TourPurchaseToken, 0)
	for _, item := range cart.Items {
		token := TourPurchaseToken{
			ID:          primitive.NewObjectID(),
			TouristID:   touristId,
			TourID:      item.TourID,
			PurchasedAt: time.Now(),
		}
		db.Collection("purchase_tokens").InsertOne(ctx(), token)
		tokens = append(tokens, token)
	}
	db.Collection("carts").UpdateOne(ctx(), bson.M{"touristId": touristId},
		bson.M{"$set": bson.M{"items": []OrderItem{}, "totalPrice": 0.0}})
	c.JSON(http.StatusOK, tokens)
}

func getPurchases(c *gin.Context) {
	touristId := c.GetString("userId")
	cur, err := db.Collection("purchase_tokens").Find(ctx(), bson.M{"touristId": touristId})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	var tokens []TourPurchaseToken
	cur.All(ctx(), &tokens)
	if tokens == nil {
		tokens = []TourPurchaseToken{}
	}
	c.JSON(http.StatusOK, tokens)
}

// ===== EXECUTION HANDLERS =====

func startExecution(c *gin.Context) {
	touristId := c.GetString("userId")
	tourId := c.Param("tourId")

	var existing TourExecution
	if err := db.Collection("executions").FindOne(ctx(), bson.M{"touristId": touristId, "status": "active"}).Decode(&existing); err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Already have an active tour execution"})
		return
	}

	if err := db.Collection("purchase_tokens").FindOne(ctx(), bson.M{"touristId": touristId, "tourId": tourId}).Err(); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": "Tour not purchased"})
		return
	}

	var pos Position
	db.Collection("positions").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&pos)

	now := time.Now()
	exec := TourExecution{
		ID:                 primitive.NewObjectID(),
		TouristID:          touristId,
		TourID:             tourId,
		Status:             "active",
		StartedAt:          now,
		LastActivity:       now,
		StartLat:           pos.Lat,
		StartLong:          pos.Long,
		CompletedKeyPoints: make([]CompletedKeyPoint, 0),
	}
	if _, err := db.Collection("executions").InsertOne(ctx(), exec); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, exec)
}

func completeExecution(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	touristId := c.GetString("userId")
	now := time.Now()
	db.Collection("executions").UpdateOne(ctx(), bson.M{"_id": id, "touristId": touristId},
		bson.M{"$set": bson.M{"status": "completed", "endedAt": now, "lastActivity": now}})
	c.JSON(http.StatusOK, gin.H{"message": "Tour completed"})
}

func abandonExecution(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	touristId := c.GetString("userId")
	now := time.Now()
	db.Collection("executions").UpdateOne(ctx(), bson.M{"_id": id, "touristId": touristId},
		bson.M{"$set": bson.M{"status": "abandoned", "endedAt": now, "lastActivity": now}})
	c.JSON(http.StatusOK, gin.H{"message": "Tour abandoned"})
}

func checkProximity(c *gin.Context) {
	id, _ := primitive.ObjectIDFromHex(c.Param("id"))
	touristId := c.GetString("userId")

	var pos Position
	if err := db.Collection("positions").FindOne(ctx(), bson.M{"touristId": touristId}).Decode(&pos); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Position not set"})
		return
	}

	var exec TourExecution
	if err := db.Collection("executions").FindOne(ctx(), bson.M{"_id": id, "touristId": touristId}).Decode(&exec); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Execution not found"})
		return
	}

	cur, _ := db.Collection("keypoints").Find(ctx(), bson.M{"tourId": exec.TourID})
	var kps []KeyPoint
	cur.All(ctx(), &kps)

	const threshold = 0.2
	now := time.Now()
	newlyCompleted := make([]string, 0)

	for _, kp := range kps {
		already := false
		for _, ckp := range exec.CompletedKeyPoints {
			if ckp.KeyPointID == kp.ID.Hex() {
				already = true
				break
			}
		}
		if already {
			continue
		}
		if haversine(pos.Lat, pos.Long, kp.Lat, kp.Long) <= threshold {
			ckp := CompletedKeyPoint{KeyPointID: kp.ID.Hex(), CompletedAt: now}
			db.Collection("executions").UpdateOne(ctx(), bson.M{"_id": id},
				bson.M{"$push": bson.M{"completedKeyPoints": ckp}})
			newlyCompleted = append(newlyCompleted, kp.ID.Hex())
		}
	}

	db.Collection("executions").UpdateOne(ctx(), bson.M{"_id": id},
		bson.M{"$set": bson.M{"lastActivity": now}})

	c.JSON(http.StatusOK, gin.H{"newlyCompleted": newlyCompleted, "position": pos})
}

func getActiveExecution(c *gin.Context) {
	touristId := c.GetString("userId")
	var exec TourExecution
	if err := db.Collection("executions").FindOne(ctx(), bson.M{"touristId": touristId, "status": "active"}).Decode(&exec); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "No active execution"})
		return
	}
	c.JSON(http.StatusOK, exec)
}

func getExecutions(c *gin.Context) {
	touristId := c.GetString("userId")
	cur, _ := db.Collection("executions").Find(ctx(), bson.M{"touristId": touristId})
	var execs []TourExecution
	cur.All(ctx(), &execs)
	if execs == nil {
		execs = []TourExecution{}
	}
	c.JSON(http.StatusOK, execs)
}

// ===== MAIN =====

func main() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		jwtSecret = []byte(secret)
	}

	connectCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(connectCtx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		panic(err)
	}
	db = client.Database("tour_service")

	r := gin.Default()
	r.Use(corsMiddleware())
	auth := authMiddleware()

	r.POST("/api/tours", auth, createTour)
	r.GET("/api/tours", auth, getTours)
	r.GET("/api/tours/mine", auth, getMyTours)
	r.GET("/api/tours/:id", auth, getTour)
	r.PUT("/api/tours/:id", auth, updateTour)
	r.PUT("/api/tours/:id/publish", auth, publishTour)
	r.PUT("/api/tours/:id/archive", auth, archiveTour)
	r.PUT("/api/tours/:id/activate", auth, activateTour)

	r.POST("/api/tours/:id/keypoints", auth, addKeyPoint)
	r.GET("/api/tours/:id/keypoints", auth, getKeyPoints)
	r.PUT("/api/keypoints/:id", auth, updateKeyPoint)
	r.DELETE("/api/keypoints/:id", auth, deleteKeyPoint)

	r.POST("/api/position", auth, setPosition)
	r.GET("/api/position", auth, getPosition)

	r.GET("/api/cart", auth, getCart)
	r.POST("/api/cart/add", auth, addToCart)
	r.DELETE("/api/cart/:tourId", auth, removeFromCart)
	r.POST("/api/cart/checkout", auth, checkout)
	r.GET("/api/purchases", auth, getPurchases)

	r.POST("/api/executions/start/:tourId", auth, startExecution)
	r.GET("/api/executions/active", auth, getActiveExecution)
	r.GET("/api/executions", auth, getExecutions)
	r.PUT("/api/executions/:id/complete", auth, completeExecution)
	r.PUT("/api/executions/:id/abandon", auth, abandonExecution)
	r.POST("/api/executions/:id/check-proximity", auth, checkProximity)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	r.Run(":" + port)
}
