namespace BileetaBarcodePrintNet;

/// <summary>
/// Splits long strings into lines by character count (for multi-line label text).
/// </summary>
public static class Spliter
{
    public static string[] SpliterString(string? str, int noOfChar)
    {
        if (string.IsNullOrEmpty(str) || noOfChar <= 0)
            return new[] { "", "", "" };

        try
        {
            var strArr = new string[3];
            var ss = str.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (ss.Length != 1)
            {
                string des1 = "", des2 = "", des3 = "";
                var sb1 = new System.Text.StringBuilder();
                int j = ss.Length;

                for (int i = 0; i < ss.Length; i++)
                {
                    string item = ss[i].Trim();
                    int len = sb1.Length + item.Length;

                    if (len >= noOfChar)
                    {
                        if (string.IsNullOrEmpty(des1)) { des1 = sb1.ToString(); sb1.Clear(); }
                        else if (string.IsNullOrEmpty(des2)) { des2 = sb1.ToString(); sb1.Clear(); }
                        else if (string.IsNullOrEmpty(des3)) { des3 = sb1.ToString(); sb1.Clear(); }
                    }

                    sb1.Append(item).Append(' ');

                    if (i == j - 1)
                    {
                        if (string.IsNullOrEmpty(des1)) des1 = sb1.ToString();
                        else if (string.IsNullOrEmpty(des2)) des2 = sb1.ToString();
                        else if (string.IsNullOrEmpty(des3)) des3 = sb1.ToString();
                    }
                }

                strArr[0] = des1 ?? "";
                strArr[1] = des2 ?? "";
                strArr[2] = des3 ?? "";
                return strArr;
            }

            if (str.Length <= noOfChar)
                return new[] { str, "", "" };
            if (str.Length <= noOfChar * 2)
                return new[] { str[..noOfChar], str[noOfChar..], "" };
            if (str.Length <= noOfChar * 3)
                return new[] { str[..noOfChar], str.Substring(noOfChar, noOfChar), str[(noOfChar * 2)..] };

            return new[] { str[..noOfChar], str.Substring(noOfChar, noOfChar), str[(noOfChar * 2)..Math.Min(noOfChar * 3, str.Length)] };
        }
        catch
        {
            return new[] { str, "", "" };
        }
    }
}
