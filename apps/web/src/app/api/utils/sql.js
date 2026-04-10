import postgres from 'postgres';

const NullishQueryFunction = () => {
  throw new Error(
    'No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set'
  );
};
NullishQueryFunction.transaction = () => {
  throw new Error(
    'No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set'
  );
};

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: 'prefer', max: 10 })
  : NullishQueryFunction;

export default sql;
