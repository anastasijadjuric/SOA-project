from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from jose import jwt, JWTError
from bson import ObjectId
import os

app = FastAPI(title="Blog Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "soa_secret_2025")

client = AsyncIOMotorClient(MONGO_URI)
db = client.blog_service


# ---------- helpers ----------

def to_str(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No token")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- models ----------

class BlogCreate(BaseModel):
    title: str
    description: str
    images: Optional[List[str]] = []


class CommentCreate(BaseModel):
    text: str


class CommentUpdate(BaseModel):
    text: str


# ---------- blog routes ----------

@app.post("/api/blogs")
async def create_blog(blog: BlogCreate, user=Depends(get_current_user)):
    doc = {
        "authorId": user["id"],
        "authorUsername": user["username"],
        "title": blog.title,
        "description": blog.description,
        "images": blog.images,
        "createdAt": datetime.utcnow().isoformat(),
        "likes": []
    }
    result = await db.blogs.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@app.get("/api/blogs/all")
async def get_all_blogs():
    blogs = await db.blogs.find().sort("createdAt", -1).to_list(200)
    return [to_str(b) for b in blogs]


@app.get("/api/blogs/my")
async def get_my_blogs(user=Depends(get_current_user)):
    blogs = await db.blogs.find({"authorId": user["id"]}).sort("createdAt", -1).to_list(200)
    return [to_str(b) for b in blogs]


@app.get("/api/blogs")
async def get_followed_blogs(user=Depends(get_current_user)):
    follows = await db.follows.find({"followerId": user["id"]}).to_list(1000)
    following_ids = [f["followingId"] for f in follows]
    following_ids.append(user["id"])
    blogs = await db.blogs.find({"authorId": {"$in": following_ids}}).sort("createdAt", -1).to_list(200)
    return [to_str(b) for b in blogs]


@app.get("/api/blogs/{blog_id}")
async def get_blog(blog_id: str):
    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    return to_str(blog)


@app.delete("/api/blogs/{blog_id}")
async def delete_blog(blog_id: str, user=Depends(get_current_user)):
    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if blog["authorId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your blog")
    await db.blogs.delete_one({"_id": ObjectId(blog_id)})
    return {"message": "Deleted"}


# ---------- comment routes ----------

@app.post("/api/blogs/{blog_id}/comments")
async def add_comment(blog_id: str, comment: CommentCreate, user=Depends(get_current_user)):
    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if blog["authorId"] != user["id"]:
        follow = await db.follows.find_one({"followerId": user["id"], "followingId": blog["authorId"]})
        if not follow:
            raise HTTPException(status_code=403, detail="You must follow the author to comment")
    now = datetime.utcnow().isoformat()
    doc = {
        "blogId": blog_id,
        "authorId": user["id"],
        "authorUsername": user["username"],
        "text": comment.text,
        "createdAt": now,
        "updatedAt": now
    }
    result = await db.comments.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@app.get("/api/blogs/{blog_id}/comments")
async def get_comments(blog_id: str):
    comments = await db.comments.find({"blogId": blog_id}).sort("createdAt", 1).to_list(200)
    return [to_str(c) for c in comments]


@app.put("/api/comments/{comment_id}")
async def update_comment(comment_id: str, body: CommentUpdate, user=Depends(get_current_user)):
    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["authorId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your comment")
    now = datetime.utcnow().isoformat()
    await db.comments.update_one({"_id": ObjectId(comment_id)}, {"$set": {"text": body.text, "updatedAt": now}})
    return {"message": "Updated"}


# ---------- like routes ----------

@app.post("/api/blogs/{blog_id}/like")
async def like_blog(blog_id: str, user=Depends(get_current_user)):
    blog = await db.blogs.find_one({"_id": ObjectId(blog_id)})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if user["id"] in blog.get("likes", []):
        raise HTTPException(status_code=400, detail="Already liked")
    await db.blogs.update_one({"_id": ObjectId(blog_id)}, {"$push": {"likes": user["id"]}})
    return {"message": "Liked"}


@app.delete("/api/blogs/{blog_id}/like")
async def unlike_blog(blog_id: str, user=Depends(get_current_user)):
    await db.blogs.update_one({"_id": ObjectId(blog_id)}, {"$pull": {"likes": user["id"]}})
    return {"message": "Unliked"}


# ---------- follow routes ----------

@app.post("/api/follow/{user_id}")
async def follow_user(user_id: str, user=Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = await db.follows.find_one({"followerId": user["id"], "followingId": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already following")
    await db.follows.insert_one({
        "followerId": user["id"],
        "followingId": user_id,
        "createdAt": datetime.utcnow().isoformat()
    })
    return {"message": "Now following"}


@app.delete("/api/follow/{user_id}")
async def unfollow_user(user_id: str, user=Depends(get_current_user)):
    await db.follows.delete_one({"followerId": user["id"], "followingId": user_id})
    return {"message": "Unfollowed"}


@app.get("/api/following")
async def get_following(user=Depends(get_current_user)):
    follows = await db.follows.find({"followerId": user["id"]}).to_list(1000)
    return [{"followingId": f["followingId"]} for f in follows]


@app.get("/api/followers")
async def get_followers(user=Depends(get_current_user)):
    follows = await db.follows.find({"followingId": user["id"]}).to_list(1000)
    return [{"followerId": f["followerId"]} for f in follows]
