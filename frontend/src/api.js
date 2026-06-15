const BASE = '';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    return;
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  // Auth
  register:    (d) => req('POST', '/api/users/register', d),
  login:       (d) => req('POST', '/api/users/login', d),
  seedAdmin:   ()  => req('POST', '/api/users/seed-admin'),

  // Users / Profile
  getProfile:  ()      => req('GET',  '/api/users/profile'),
  updateProfile: (d)   => req('PUT',  '/api/users/profile', d),
  getUsers:    ()      => req('GET',  '/api/users'),
  getAllUsers:  ()      => req('GET',  '/api/users/all'),
  blockUser:   (id)    => req('PUT',  `/api/users/${id}/block`),
  unblockUser: (id)    => req('PUT',  `/api/users/${id}/unblock`),

  // Blogs
  getAllBlogs: ()         => req('GET',  '/api/blogs/all'),
  getBlogs:   ()         => req('GET',  '/api/blogs'),
  getMyBlogs: ()         => req('GET',  '/api/blogs/my'),
  getBlog:    (id)       => req('GET',  `/api/blogs/${id}`),
  createBlog: (d)        => req('POST', '/api/blogs', d),
  deleteBlog: (id)       => req('DELETE', `/api/blogs/${id}`),

  // Comments
  getComments:  (bid)    => req('GET',  `/api/blogs/${bid}/comments`),
  addComment:   (bid, d) => req('POST', `/api/blogs/${bid}/comments`, d),
  updateComment:(cid, d) => req('PUT',  `/api/comments/${cid}`, d),

  // Likes
  likeBlog:   (bid)      => req('POST',   `/api/blogs/${bid}/like`),
  unlikeBlog: (bid)      => req('DELETE', `/api/blogs/${bid}/like`),

  // Follow
  followUser:   (uid)    => req('POST',   `/api/follow/${uid}`),
  unfollowUser: (uid)    => req('DELETE', `/api/follow/${uid}`),
  getFollowing: ()       => req('GET',    '/api/following'),

  // Tours
  getTours:    ()        => req('GET',  '/api/tours'),
  getMyTours:  ()        => req('GET',  '/api/tours/mine'),
  getTour:     (id)      => req('GET',  `/api/tours/${id}`),
  createTour:  (d)       => req('POST', '/api/tours', d),
  updateTour:  (id, d)   => req('PUT',  `/api/tours/${id}`, d),
  publishTour: (id)      => req('PUT',  `/api/tours/${id}/publish`),
  archiveTour: (id)      => req('PUT',  `/api/tours/${id}/archive`),
  activateTour:(id)      => req('PUT',  `/api/tours/${id}/activate`),

  // KeyPoints
  getKeyPoints:   (tid)      => req('GET',    `/api/tours/${tid}/keypoints`),
  addKeyPoint:    (tid, d)   => req('POST',   `/api/tours/${tid}/keypoints`, d),
  updateKeyPoint: (id, d)    => req('PUT',    `/api/keypoints/${id}`, d),
  deleteKeyPoint: (id)       => req('DELETE', `/api/keypoints/${id}`),

  // Position
  getPosition: ()        => req('GET',  '/api/position'),
  setPosition: (d)       => req('POST', '/api/position', d),

  // Cart
  getCart:       ()      => req('GET',    '/api/cart'),
  addToCart:     (d)     => req('POST',   '/api/cart/add', d),
  removeFromCart:(tid)   => req('DELETE', `/api/cart/${tid}`),
  checkout:      ()      => req('POST',   '/api/cart/checkout'),
  getPurchases:  ()      => req('GET',    '/api/purchases'),

  // Execution
  startExecution:    (tid) => req('POST', `/api/executions/start/${tid}`),
  getActiveExecution: ()   => req('GET',  '/api/executions/active'),
  getExecutions:      ()   => req('GET',  '/api/executions'),
  completeExecution: (id)  => req('PUT',  `/api/executions/${id}/complete`),
  abandonExecution:  (id)  => req('PUT',  `/api/executions/${id}/abandon`),
  checkProximity:    (id)  => req('POST', `/api/executions/${id}/check-proximity`),
};
