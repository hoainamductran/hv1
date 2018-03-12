require('dotenv').config();

const csvdata = require('csvdata');
const express = require('express');
const {
  getBooks,
  insertCategory,
  insertBooks,
  searchBook,
} = require('./helper.js');

const { replaceSlash } = require('./util.js');

const router = express.Router();

const { port } = process.env;

const booksPath = './data/books.csv';

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

async function makeLink(data, offset, limit, search) {
  const searched = {
    links: {
      self: {
        href: `http://localhost:${port}/books?search=${search}&offset=${offset}&limit=${limit}`,
      },
    },
    limit,
    offset,
    items: await replaceSlash(data),
  };
  if (offset > 0) {
    searched.links.prev = {
      href: `http://localhost:${port}/books?search=${search}&offset=${offset - limit}&limit=${limit}`,
    };
  }
  if (searched.items.length <= limit) {
    searched.links.next = {
      href: `http://localhost:${port}/books?search=${search}&offset=${offset + limit}&limit=${limit}`,
    };
  }
  return searched;
}

async function allBookLink(data, offset, limit) {
  const searched = {
    links: {
      self: {
        href: `http://localhost:${port}/books?offset=${offset}&limit=${limit}`,
      },
    },
    limit,
    offset,
    items: await replaceSlash(data),
  };
  if (offset > 0) {
    searched.links.prev = {
      href: `http://localhost:${port}/books?offset=${offset - limit}&limit=${limit}`,
    };
  }
  if (searched.items.length <= limit) {
    searched.links.next = {
      href: `http://localhost:${port}/books?offset=${offset + limit}&limit=${limit}`,
    };
  }
  return searched;
}

router.get('/csv', (req, res) => {
  csvdata.load(booksPath, { delimiter: ',' })
    .then((result) => {
      Promise.all(result)
        .then(async (data) => {
          const startTime = Math.floor(new Date().getTime() / 1000);
          for (let i = 0; i !== data.length; i += 1) {
            await insertCategory(data[i].category);
          }
          for (let j = 0; j !== data.length; j += 1) {
            await insertBooks(data[j].title, data[j].isbn13, data[j].author, data[j].description,
              data[j].category, data[j].isbn10, data[j].published, data[j].pagecount, data[j].language);
          }
          const endTime = Math.floor(new Date().getTime() / 1000);
          const elapsedTime = endTime - startTime;
          return elapsedTime;
        })
        .then(timer => console.info(`Imported data from .csv took: ${timer} seconds , the data has been added successfully`))
        .catch(err => console.warn(err));
      res.status(200).json(result);
    })
    .catch(err => console.warn(err));
});

router.get('/books', async (req, res) => {
  let { offset = 0, limit = 10, search } = req.query;
  offset = Number(offset);
  limit = Number(limit);
  if (search) {
    const searchedBook = await searchBook(search, offset);
    const data = await makeLink(searchedBook, offset, limit, search);
    res.status(200).json(data);
  } else {
    const findBook = await getBooks(offset);
    const books = await allBookLink(findBook, offset, limit);
    res.status(200).json(books);
  }
});

module.exports = router;