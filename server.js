const express = require("express");
const app = express();
const port = 3000;
const { buildSchema } = require("graphql");
const { graphqlHTTP } = require("express-graphql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");

require("./connection");
const secret = "mysecret";

/// lab //////
// update post
// delete post
// get one post
// post commments : crud operation
// on getting post : comments

const schema = buildSchema(`
	type Post {
		title:String!
		content:String!
		user:User
    comments:[Comment]
	}
	type User {
		name:String!
		email:String!
		posts:[Post]
	}
  type Comment {
    content:String!
		user:User
    post:Post
  }
	input UserInput {
		name:String!
		email:String!
		password:String!
	}
	type Query {
		test:String
		usersGetAll:[User!]!
		userGetOne(id:ID!):User!
		getMyPosts(token:String!):[Post!]!
    getMyComments(token:String!,_id:ID!):[Comment!]!
    commentGetOneById(token:String!,_id:ID!):Comment
	}
	type Mutation {
		userCreate(input:UserInput):User
		userLogin(email:String!,password:String!):String
		postCreate(title:String!,content:String!,token:String!):String
		postUpdate(title:String!,content:String!,token:String!,_id:ID):Post
    postDelete(token:String!,_id:ID):Post
    postGetOneById(token:String!,_id:ID!):Post
    commentCreate(token:String!,content:String!,_id:ID! ):String
    commentUpdate(token:String!,content:String!,_id:ID!):Comment
    commentDelete(token:String!,_id:ID!):Comment
	}
`);
const userQueries = {
  test: async () => {
    const user = await User.find().populate("posts");
    console.log(JSON.stringify(user, null, 2));
    return "test";
  },
  usersGetAll: async () => {
    const users = await User.find();
    return users;
  },
  userGetOne: async ({ id }) => {
    const user = await User.findById(id).populate("posts");
    console.log("🚀 ~ file: server.js:55 ~ userGetOne: ~ user", user);
    return user;
  },
};
const userMutations = {
  userCreate: async ({ input }) => {
    const { name, email, password } = input;
    const hashedPassword = await bcrypt.hash(password, 10);
    const UserCreated = new User({ name, email, password: hashedPassword });
    console.log(hashedPassword);
    await UserCreated.save();
    return {
      name,
      email,
    };
  },
  userLogin: async ({ email, password }) => {
    const user = await User.findOne({ email });
    const isValidPassword = await bcrypt.compare(password, user?.password);
    if (!user || !isValidPassword) throw new Error("Invalid credentials");
    console.log("user", user);
    const token = jwt.sign({ userId: user._id }, secret);
    return token;
  },
};
const auth = async (token) => {
  const { userId } = jwt.verify(token, secret);
  const user = await User.findById(userId);
  return user;
};
const postQueries = {
  getMyPosts: async ({ token }) => {
    const user = await auth(token);
    const posts = await Post.find({ userId: user._id })
      .populate("userId")
      .populate("comments");

    console.log("posts", posts);
    console.log("posts", posts[0].comments);
    // return posts.map((post) => ({ ...post._doc, user: post.userId }));
    return posts[0].comments;
  },
  postGetOneById: async ({ token, _id }) => {
    const user = await auth(token);
    const post = await Post.findById(_id);
    return post;
  },
};
const postMutations = {
  postCreate: async ({ title, content, token }) => {
    const user = await auth(token);
    const post = new Post({ title, content, userId: user._id });
    // console.log("user", user);
    await post.save();
    return "post created";
  },
  postUpdate: async ({ title, content, token, _id }) => {
    const user = await auth(token);
    const updatedPost = await Post.findByIdAndUpdate(_id, {
      title,
      content,
    });
    console.log("_id", _id);
    console.log("updatedPost", updatedPost);
    return updatedPost;
  },
  postDelete: async ({ token, _id }) => {
    const user = await auth(token);
    const deletedPost = await Post.findByIdAndDelete(_id);
    console.log("deletedPost", deletedPost);
    return deletedPost;
  },
};
const commentQueries = {
  getMyComments: async ({ token, _id }) => {
    const user = await auth(token);
    const comments = await Post.findById(_id).populate("postId");
    console.log("comments", comments);
    return comments;
  },
  commentGetOneById: async ({ token, _id }) => {
    const user = await auth(token);
    const comment = await Comment.findById(_id);
    return comment;
  },
};
const commentMutations = {
  commentCreate: async ({ token, content, _id }) => {
    const user = await auth(token);
    const comment = new Comment({ content, userId: user._id, postId: _id });
    // console.log("user", user);
    await comment.save();
    return "comment created";
  },
  commentUpdate: async ({ token, content, _id }) => {
    const user = await auth(token);
    const updatedComment = await Comment.findByIdAndUpdate(_id, {
      content,
    });
    return updatedComment;
  },
  commentDelete: async ({ token, _id }) => {
    const user = await auth(token);
    const deletedComment = await Comment.findByIdAndDelete(_id);
    return deletedComment;
  },
};

const resolvers = {
  ...userQueries,
  ...userMutations,
  ...postQueries,
  ...postMutations,
  ...commentQueries,
  ...commentMutations,
};
app.use(
  "/graphql",
  graphqlHTTP({ schema, rootValue: resolvers, graphiql: true })
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
