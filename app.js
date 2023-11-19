const express = require('express');
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const bcrypt = require('bcrypt')
const PORT = process.env.PORT || 8080;


require('dotenv').config(); // Load environment variables from .env file

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);

app.use(express.json());

// Use the environment variables in your application
const databaseUrl = process.env.DATABASE_URL;
console.log(databaseUrl)
mongoose
    .connect(databaseUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB is  connected successfully"))
    .catch((err) => console.error(err))

const User = require('./models/User');
const Blog = require('./models/Blog');

// Sample endpoint to respond to GET requests
app.get('/', (req, res) => {
    res.json({ message: 'Hello from the server!' });
});



// Registration endpoint
app.post('/api/register', async (req, res) => {
    const { email, password, username } = req.body;

    console.log(req.body)

    try {
        // Check if the username or email already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.json({ error: 'Email or username already exists', registered: false });
        }

        // Create a new user
        const hashedPassword = await bcrypt.hash(password,10); // 10 is the saltRounds

        const newUser = new User({ email, password: hashedPassword, username });
        await newUser.save();

        return res.json({ message: 'User registered successfully', redirect: '/login', registered: true });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});


app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email in the database
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ loggedIn: false, error: 'Invalid credentials' });
        }

        // Check if the password matches the hashed password in the database
        const passwordMatches = await user.comparePassword(password);

        if (!passwordMatches) {
            return res.json({ loggedIn: false, error: 'Invalid credentials' });
        }

        // If both email and password match, send a success response
        return res.status(200).json({ loggedIn: true, redirect: '/', username: user.username});
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ loggedIn: false, error: 'Server error' });
    }
});

app.post('/api/posts', async (req, res) => {
    const { title, imageUrl, highlight, content, author } = req.body; // Extract blog data from the request body

    try {
        // Find the user by username to get their ID
        const user = await User.findOne({ username: author });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a new blog instance with the user's ID as the author
        const newBlog = new Blog({
            title,
            imageUrl,
            highlight,
            content,
            author: user._id // Use the user's ID as the author
        });

        // Save the new blog to the database
        await newBlog.save();

        return res.status(201).json({ message: 'Blog post created successfully' });
    } catch (error) {
        console.error('Error creating blog post:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/blogs', async (req, res) => {
    try {
        // Fetch all blogs from the database and populate the 'author' field with the 'username'
        const blogs = await Blog.find().populate('author', 'username');

        // Transform the data to replace author ID with author username
        const blogsData = blogs.map(blog => ({
            id: blog.id,
            title: blog.title,
            imageUrl: blog.imageUrl,
            highlight: blog.highlight,
            content: blog.content,
            author: blog.author.username // Assuming 'author' field is a reference to User model
        }));

        res.json(blogsData);
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/blog/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const blog = await Blog.findById(id).populate('author', 'username');
        console.log(blog)

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        return res.status(200).json(blog);
    } catch (error) {
        console.error('Error fetching blog:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});


// Update a blog by ID
app.put('/api/blog/:id', async (req, res) => {
    const { id } = req.params;
    const { title, imageUrl, highlight, content } = req.body;
  
    try {
      // Find the blog post by its ID
      const blog = await Blog.findById(id);
  
      if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
      }
  
      // Update the blog post properties
      blog.title = title;
      blog.imageUrl = imageUrl;
      blog.highlight = highlight;
      blog.content = content;
  
      // Save the updated blog post
      await blog.save();
  
      return res.status(200).json({ message: 'Blog updated successfully', blog });
    } catch (error) {
      console.error('Error updating blog:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });


  app.delete('/api/blog/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Find the blog by ID and delete it
        const deletedBlog = await Blog.findByIdAndDelete(id);

        if (!deletedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        return res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Error deleting blog:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
