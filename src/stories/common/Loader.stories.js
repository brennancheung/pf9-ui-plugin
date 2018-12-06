import React from 'react'
import { addStoriesFromModule } from '../helpers'

import Loader from 'core/common/Loader'

const addStories = addStoriesFromModule(module)

addStories('Common Components/Loader', {
  'Default settings': () => (
    <Loader />
  ),

  'Custom message': () => (
    <Loader message="Fetching data..." />
  ),
})
