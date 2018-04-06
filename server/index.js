import express from 'express';
import fs from 'fs-extra';
import webpack from 'webpack';
import { argv } from 'optimist';
import { get } from 'request-promise';
import { questions, question } from '../data/api-real-url';
import { delay } from 'redux-saga';
import getStore from '../src/getStore';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import React from 'react';
import App from '../src/App';
import { ConnectedRouter } from 'react-router-redux';
import createHistory from 'history/createMemoryHistory';

const port = process.env.PORT || 3000;
const app = express();

const useLiveData = argv.useLiveData === 'true';
const useServerRender = argv.useServerRender === 'true';

async function getQuestions() {
    let data;
    if(useLiveData) {
        data = await get(questions, {gzip:true});
    } else {
        data = await fs.readFile('./data/mock-questions.json', 'utf-\8');
    }
    return JSON.parse(data);
}

async function getQuestion(question_id) {
    let data;
    if(useLiveData) {
        data = await get(question(question_id), {gzip:true, json:true});
    } else {
        const questions = await getQuestions();
        const question = questions.items.find(question => question.question_id == question_id);
        question.body = `Mock question body: ${question_id}`;
        data = {items:[question]};
    }
    return data;
}

app.get('/api/questions', async (req, res) => {
    const data = await getQuestions();
    await delay(150);
    res.json(data);
})

app.get('/api/questions/:id', async (req, res) => {
    const data = await getQuestion(req.params.id);
    await delay(150);
    res.json(data);
})

if(process.env.NODE_ENV === 'development') {
    const config = require('../webpack.config.dev.babel').default;
    const compiler = webpack(config);

    app.use(require('webpack-dev-middleware')(compiler, {
        noInfo: true
    }));

    app.use(require('webpack-hot-middleware')(compiler));
}

app.get(['/', '/questions/:id'], async (req, res) => {
    let index = await fs.readFile('./public/index.html', 'utf-8');

    const initialState = {
        questions: []
    };

    const history = createHistory({
        initialEntries: [req.path]
    });

    if(req.params.id) {
        const question_id = req.params.id;
        const response = await getQuestion(question_id);
        const questionDetails = response.items[0];
        initialState.questions = [{...questionDetails, question_id}];
    } else {
        const questions = await getQuestions();
        initialState.questions = questions.items;
    }

    const store = getStore(history, initialState);

    if(useServerRender) {
        const appRendered = renderToString(
            <Provider store={store}>
                <ConnectedRouter history={history}>
                    <App />
                </ConnectedRouter>
            </Provider>
        )
        index = index.replace(`<%= preloadedApplication %>`, appRendered);
    } else {
        index = index.replace(`<%= preloadedApplication %>`, `Please wait while we load the applications.`);
    }

    res.send(index);
});

app.listen(port, '0.0.0.0', () => console.info(`App listening on ${port}`));
