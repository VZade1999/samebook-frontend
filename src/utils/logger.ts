const logMessage = (location:any, message:any) => {
  const env = process.env.NODE_ENV;
  if (env === "local" || env === "uat") {
    console.log(location, +"-->" + message);
  }
};

export default logMessage;
