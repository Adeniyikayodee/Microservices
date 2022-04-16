const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

//list comments associated with a particulat post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

//make  comment on a particular post
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  const comments = commentsByPostId[req.params.id] || [];

  comments.push({ id: commentId, content, status: "pending" });

  commentsByPostId[req.params.id] = comments;

  //emits events of comments
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: "pending"
    }
  });

  //recives events emiited from posts
  app.post('/events', async (req, res) => {
    console.log('Received Event', req.body.type);
    
    const { type, data } = req.body;

    if (type === "CommentModerated") {
      const { postId, id, status } = data;
      const comments = commentsByPostId[postId];

      const comment = comments.find(comment => {
        return comment.id === id;
      });
      comment.status = status;

      await axios.post("http://localhost:4005", {
        type: "CommentUpdated",
        data: {
          id,
          status,
          postId, 
          content
        }
      });
    };

    res.send({});
  });

  res.status(201).send(comments);
});

app.listen(4001, () => {
  console.log('Listening on 4001');
});
