using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BileetaBarcodePrint
{
    public class Spliter
    {
        public static string[] spliter(string str, int noOfChar)
        {
            try
            {
                string[] strArr = new string[3];
                string s = str;
                string[] ss = s.Split(' ');
                int len = 0;
                string des1 = "";
                string des2 = "";
                string des3 = "";
                int i = 0;
                int j = ss.Length;
                StringBuilder sb1 = new StringBuilder();
                if (ss.Count() != 1)
                {
                    foreach (string item1 in ss)
                    {
                        string item = item1.Trim();
                        len = sb1.Length + item.Length;
                        string sss = sb1.ToString();
                        if (len >= noOfChar)
                        {
                            if (des1 == "")
                            {
                                des1 = sb1.ToString();
                                sb1.Clear();
                                len = 0;
                            }
                            if (des2 == "")
                            {
                                des2 = sb1.ToString();
                                sb1.Clear();
                                len = 0;
                            }
                            if (des3 == "")
                            {
                                des3 = sb1.ToString();
                                sb1.Clear();
                                len = 0;
                            }
                        }

                        sb1.Append(item.Trim() + " ");   
                        i++;

                        if (j == i)
                        {
                            if (des1 == "")
                            {
                                des1 = sb1.ToString();
                                sb1.Clear();
                                len = 0;
                            }
                            if (des2 == "")
                            {
                                des2 = sb1.ToString();
                                sb1.Clear();
                                len = 0;
                            }
                            if (des3 == "")
                            {
                                des3 = sb1.ToString();
                                sb1.Clear();
                                len = 0;
                            }
                        }
                    }
                    strArr[0] = des1;
                    strArr[1] = des2;
                    strArr[2] = des3;

                    return strArr;
                }
                else
                {
                    if (str.Length <= noOfChar)
                    {
                        strArr[0] = str.Substring(0, str.Length); ;
                        strArr[1] = "";
                        strArr[2] = "";
                    }
                    if (noOfChar < str.Length && str.Length <= noOfChar * 2)
                    {
                        strArr[0] = str.Substring(0, noOfChar);
                        strArr[1] = str.Substring(strArr[0].Length, str.Length - (strArr[0].Length));
                        strArr[2] = "";
                    }
                    if (noOfChar * 2 < str.Length && str.Length < noOfChar * 3)
                    {
                        strArr[0] = str.Substring(0, noOfChar);
                        strArr[1] = str.Substring(strArr[0].Length, noOfChar * 2 - (strArr[0].Length));
                        string sss = strArr[1].ToString();

                        strArr[2] = str.Substring((strArr[0].Length + strArr[1].Length), str.Length - (strArr[0].Length + strArr[1].Length));
                    }

                    return strArr;
                }

            }
            catch (Exception ex)
            {
                throw;
            }
        }
    }
}
