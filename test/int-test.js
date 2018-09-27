'use strict';

const mongoose = require('mongoose');
const faker = require('faker');
const chai = require('chai');
const chaiHttp = require('chai-http');

const should = chai.should();

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog post data');
    const seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        });
    }
    // this will return a promise
    return BlogPost.insertMany(seedData);
};


function tearDown() { 
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
};


function firstThis() {
    before(function () {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function () {
        return seedBlogData();
    });

    afterEach(function () {
        return tearDown();
    });

    after(function () {
        return closeServer();
    });
}

describe(`Blog API resource`, function () {
    firstThis();
    

    //GET TEST
    describe(`Get endpoints`, function () {

        it(`Should display blog posts`, function () {

            let res;
            return chai.request(app)
                .get('/posts')
                .then(_res => {
                    res = _res;
                    res.should.have.status(200);
                    res.body.should.have.lengthOf.at.least(1);

                    return BlogPost.count();
                })
                .then(count => {
                    res.body.should.have.lengthOf(count);
                });
        })


        it(`Should display correct info`, function () {
            let resPost;
            return chai.request(app)
                .get('/posts')
                .then(function (res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.a('array');
                    res.body.forEach(function (post) {
                        post.should.be.a('object');
                        post.should.include.keys('title', 'content', 'author', 'id', 'created');
                    });
                    resPost = res.body[0];
                    return BlogPost.findById(resPost.id)
                })
                .then(function (post) {
                    resPost.title.should.equal(post.title);
                    resPost.content.should.equal(post.content);
                    resPost.author.should.equal(post.authorName);
                })
                })
    });
  
    //POST endpoint
    describe('Post endpoint', function () {
        it(`Should post new blog posts`, function () {

            const newPost = {
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName()
                },
                title: faker.lorem.sentence(),
                content: faker.lorem.text()
            };

            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function (res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys('title', 'content', 'author', 'id', 'created');
                    res.body.title.should.equal(newPost.title);
                    res.body.content.should.equal(newPost.content);
                    res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
                    res.body.id.should.not.be.null;
                    return BlogPost.findById(res.body.id);
                })
                .then(function (post) {
                    post.title.should.equal(newPost.title);
                    post.content.should.equal(newPost.content);
                    post.author.firstName.should.equal(newPost.author.firstName);
                    post.author.lastName.should.equal(newPost.author.lastName);
                })
        })
    })

    //PUT endpoint
    describe('Put endpoints', function () {
        it(`Should update an exsisting blog post`, function () {
            const updated = {
                title: 'Hello',
                content: 'Good Morning',
                author: {
                    firstName: 'John',
                    lastName: 'Smith'
                }
            };

            return BlogPost
                .findOne()
                .then(post => {
                    updated.id = post.id;
                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                    .send(updated)
                })
                .then(res => {
                    res.should.have.status(204);
                    return BlogPost.findById(updated.id);
                })
                .then(post => {
                    post.title.should.equal(updated.title);
                    post.content.should.equal(updated.content);
                    post.author.firstName.should.equal(updated.author.firstName);
                    post.author.lastName.should.equal(updated.author.lastName);
                })           
        })

    })

    //DELETE endpoint
    describe('Delete endpoint', function () {
        let res;

        return BlogPost.findOne()
            .then(_res => {
                res = _res;
                return chai.request(app)
                    .delete(`/posts/${res.id}`);
            })
            .then(post => {
                post.should.have.status(204);
                return BlogPost.findById(res.id)
            })
            .then(_res => should.not.exist(_res))
    })
});