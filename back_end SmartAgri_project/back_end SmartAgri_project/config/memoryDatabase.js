const { newDb, DataType } = require("pg-mem");
const { v4: uuidv4 } = require("uuid");

const truncateDate = (unit, value) => {
  if (!(value instanceof Date)) return value;

  const normalizedUnit = String(unit || "").toLowerCase();
  const date = new Date(value);

  if (normalizedUnit === "week") {
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day);
  }

  if (normalizedUnit === "week" || normalizedUnit === "day") {
    date.setUTCHours(0, 0, 0, 0);
  } else if (normalizedUnit === "month") {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  }

  return date;
};

const registerFunctions = (database) => {
  database.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: () => uuidv4(),
    impure: true,
  });

  for (const timestampType of [DataType.timestamp, DataType.timestamptz]) {
    database.public.registerFunction({
      name: "date_trunc",
      args: [DataType.text, timestampType],
      returns: timestampType,
      implementation: truncateDate,
      impure: true,
    });
  }
};

const createMemoryPool = () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  registerFunctions(database);
  const memoryPg = database.adapters.createPg();
  return new memoryPg.Pool();
};

module.exports = { createMemoryPool };
