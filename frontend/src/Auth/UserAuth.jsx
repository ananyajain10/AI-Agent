import React, { Children, useContext, useEffect, useState } from "react";
import { UserContext } from "../context/user.context";

const UserAuth = ({children}) => {
  const { user, loading } = useContext(UserContext);
  if (loading){
    return null;
  }

  if (!user){
    return navigate("/login");
  }
 
  return <>
   {children}
  </>
};

export default UserAuth;
