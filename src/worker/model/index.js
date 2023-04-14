const _ = require('lodash');
const { TABLE, DATABASE_URL } = require('@serverless-cd/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});
const applicationPrisma = prisma[TABLE.APPLICATION];
const taskPrisma = prisma[TABLE.TASK];

const makeSetTaskData = (data) => {
  if (_.isArray(data.steps)) {
    data.steps = JSON.stringify(data.steps);
  }
  if (_.isPlainObject(data.trigger_payload)) {
    data.trigger_payload = JSON.stringify(data.trigger_payload);
  }
  return data;
};
const getTaskInfo = (result) => {
  if (!result) {
    return {};
  }
  if (_.isArray(result)) {
    result = _.first(result);
  }

  if (_.isString(result.steps)) {
    _.set(result, 'steps', JSON.parse(result.steps));
  }
  if (_.isString(result.trigger_payload)) {
    _.set(result, 'trigger_payload', JSON.parse(result.trigger_payload));
  }

  return result;
};

/**
 * 通过 appId 修改应用信息
 * @param {*} id
 * @returns
 */
async function updateAppEnvById(id, envName, latestTask) {
  const result = await applicationPrisma.findUnique({ where: { id } });
  if (_.isEmpty(result)) {
    throw new Error(`Not found app with id ${id}`);
  }
  result.environment = _.isString(result.environment)
    ? JSON.parse(result.environment)
    : result.environment;
  if (latestTask && !latestTask.time) {
    _.set(latestTask, 'time', new Date(latestTask.time));
  }
  _.set(result, `environment.[${envName}].latest_task`, latestTask);
  result.environment = JSON.stringify(result.environment);
  _.unset(result, 'id');
  console.log('result: ', result);
  return applicationPrisma.update({ where: { id }, data: result });
}

async function getTask(id) {
  const result = await taskPrisma.findUnique({ where: { id } });
  return getTaskInfo(result);
}

async function createTask(data) {
  return await taskPrisma.create({ data: makeSetTaskData(data) });
}

async function updateTask(id, data) {
  return await taskPrisma.update({ where: { id }, data: makeSetTaskData(data) });
}

/**
 * 处理 task
 * @param {*} id
 * @param {*} params
 * @returns
 */
async function makeTask(id, data = {}) {
  const result = await getTask(id);
  if (_.isEmpty(result)) {
    return await createTask({
      ...data,
      id,
    });
  }

  return await updateTask(id, data);
}

module.exports = {
  updateAppEnvById,
  makeTask,
  getTask,
};
