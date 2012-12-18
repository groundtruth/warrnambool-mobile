<?php

session_start();

function logout() 
{ 
  if (session_start()) 
  { 
    session_destroy(); 

    return true; 
  } 
  return false; 
} 

function login($pass)
{
  if ($pass === '2310')
  {
    return $pass;
  }
  else return null;
}

?> 
