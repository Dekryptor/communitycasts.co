// @flow

import test from 'ava'
import config from 'config'

test('youtube exports a function', t => {
  const youtube = require('../source/util/youtube').default

  t.ok(typeof youtube === 'function')
})

test('youtube has apiKey property', t => {
  const Youtube = require('../source/util/youtube').default
  const {apiKey} = new Youtube(config.youtubeApiKey)

  t.ok(apiKey === config.youtubeApiKey)
})

test('fetchVideoDetails returns correct result', async t => {
  const Youtube = require('../source/util/youtube').default
  const youtube = new Youtube(config.youtubeApiKey)
  const actual = await youtube.fetchVideoDetails('https://youtu.be/jNQXAC9IVRw')

  t.ok(actual.id  === 'jNQXAC9IVRw')
  t.ok(actual.title === 'Me at the zoo')
  t.ok(actual.description.match(/^The first video on YouTube/))
  t.ok(actual.durationInSeconds === 19)
  t.ok(actual.channel.title === 'jawed')
  t.ok(actual.channel.id === 'UC4QobU6STFB0P71PMvOGN5A')
})
