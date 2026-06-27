import User from '../models/User.js'
import Message from '../models/Message.js'
import Community from '../models/Community.js'
import Report from '../models/Report.js'
import Call from '../models/Call.js'
import { updateTrustScore } from '../utils/trustEngine.js'

export const getStats = async (req, res, next) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, activeNow, messagesToday, totalCommunities, callsToday,
      trustDist, userActivity, messageActivity, avgTrust,
    ] = await Promise.all([
      User.countDocuments({ isBanned: false }),
      User.countDocuments({ isOnline: true }),
      Message.countDocuments({ createdAt: { $gte: todayStart } }),
      Community.countDocuments(),
      Call.countDocuments({ createdAt: { $gte: todayStart } }),
      User.aggregate([
        { $match: { isBanned: false } },
        { $group: { _id: '$trustLevel', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { label: '$_id', count: 1, _id: 0 } },
      ]),
      Message.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { label: '$_id', count: 1, _id: 0 } },
      ]),
      User.aggregate([{ $group: { _id: null, avg: { $avg: '$trustScore' } } }]),
    ])

    const trustDistribution = trustDist.reduce((acc, t) => {
      acc[t._id?.toLowerCase()] = t.count
      return acc
    }, {})

    res.json({
      success: true,
      totalUsers,
      activeNow,
      messagesToday,
      totalCommunities,
      callsToday,
      trustDistribution,
      userActivity,
      messageActivity,
      avgTrustScore: Math.round(avgTrust[0]?.avg || 0),
      scamsBlocked: 0, // updated by AI service
      translationsToday: 0,
    })
  } catch (err) { next(err) }
}

export const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .populate('reporter', 'fullName username avatar')
      .populate('reportedUser', 'fullName username avatar trustScore trustLevel')
      .sort({ createdAt: -1 })
    res.json({ success: true, reports })
  } catch (err) { next(err) }
}

export const resolveReport = async (req, res, next) => {
  try {
    await Report.findByIdAndUpdate(req.params.reportId, {
      status: 'resolved',
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
    })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, trustFilter } = req.query
    const query = {}
    if (search) query.$or = [{ fullName: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } }]
    if (trustFilter && trustFilter !== 'all') {
      const ranges = { trusted: [90, 100], reliable: [70, 89], average: [50, 69], suspicious: [0, 49] }
      const range = ranges[trustFilter]
      if (range) query.trustScore = { $gte: range[0], $lte: range[1] }
    }

    const total = await User.countDocuments(query)
    const users = await User.find(query)
      .select('fullName username avatar trustScore trustLevel isOnline isBanned isAdmin createdAt badges')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    res.json({ success: true, users, total })
  } catch (err) { next(err) }
}

export const banUser = async (req, res, next) => {
  try {
    const { reason } = req.body
    await User.findByIdAndUpdate(req.params.userId, { isBanned: true, banReason: reason || 'Violated terms' })
    await updateTrustScore(req.params.userId, 'BANNED')
    await Report.updateMany({ reportedUser: req.params.userId, status: 'pending' }, { status: 'resolved', resolvedBy: req.user._id, resolvedAt: new Date() })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const unbanUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { isBanned: false, banReason: '' })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const getAIStats = async (req, res, next) => {
  // These would be tracked in a separate AIStats model in production
  res.json({
    success: true,
    smartReplies: 0,
    summaries: 0,
    translations: 0,
    scamsBlocked: 0,
    threatBreakdown: [],
    smartReplyAdoption: 0,
    translationAdoption: 0,
    summaryAdoption: 0,
  })
}