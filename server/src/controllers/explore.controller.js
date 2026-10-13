import exploreService from '../services/exploreService.js';

// StoryBuilder explore controller — public catalog read (SPEC §3.2 Stories).
// Query params are validated upstream by `exploreQuerySchema`; the service
// hard-scopes results to published stories.
export async function explore(req, res, next) {
  try {
    const result = await exploreService.explore(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default { explore };
