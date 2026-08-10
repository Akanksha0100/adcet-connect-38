/**
 * ADCET Alumni Association board members, in the order maintained by the
 * alumni office. Photos live in `public/AlumniAssociation/`; a member without
 * a photograph on file gets an initials avatar instead.
 */
export interface BoardMember {
  name: string;
  /** Position held on the association board. */
  authority: string;
  /** Institutional role shown in brackets. */
  designation: string;
  photo: string | null;
}

const dir = "/AlumniAssociation";

export const BOARD_MEMBERS: BoardMember[] = [
  { name: "Adv. Rajendra Dange", authority: "President", designation: "Secretary, SDSS, Urun-Ishwarpur", photo: `${dir}/RajendraDange.png` },
  { name: "Dr. L. Y. Waghmode", authority: "Vice-President", designation: "Director, ADCET, Ashta", photo: `${dir}/L.Y.Waghmode.png` },
  { name: "Dr. S. B. Hivarekar", authority: "Member", designation: "Dean, Faculty and Student Development", photo: `${dir}/S.B.Hivarekar.png` },
  { name: "Dr. Gopinath S.", authority: "Member", designation: "Dean, Academics", photo: `${dir}/S.Gopinath.png` },
  { name: "Dr. P. D. Kulkarni", authority: "Member", designation: "Dean, International Collaborations", photo: `${dir}/P.D.Kulkarni.png` },
  { name: "Dr. R. R. Gaji", authority: "Secretary", designation: "Dean, Alumni Relations and Strategic Partnership", photo: `${dir}/R.R.Gaji.png` },
  { name: "Mr. Sandip Magdum", authority: "Member", designation: "Dean, Industry Partnership and Campus Placement", photo: `${dir}/S.Magdum.png` },
  { name: "Mr. Vallabh Joshi", authority: "Member", designation: "Alumni Representative, Mechanical Engineering", photo: `${dir}/V.Joshi.png` },
  { name: "Mr. Sagar Anturkar", authority: "Member", designation: "Alumni Representative, Electronics and Telecommunication", photo: `${dir}/S.Anturkar.png` },
  { name: "Mr. Vikram Gharge", authority: "Member", designation: "Alumni Representative, Information Technology", photo: `${dir}/V.Gharage.png` },
  { name: "Ms. Anuprit D. Jadhav", authority: "Member", designation: "Alumni Representative, Computer Science Engineering", photo: `${dir}/A.D.Jadhav.png` },
  { name: "Mr. Pratik Patil", authority: "Member", designation: "Alumni Representative, Civil Engineering", photo: `${dir}/P.Patil.png` },
  { name: "Mr. Amir Khan", authority: "Member", designation: "Alumni Representative, Electrical Engineering", photo: `${dir}/AmirKhan.png` },
  { name: "Mr. Ganesh Malgunde", authority: "Member", designation: "Alumni Representative, Aeronautical Engineering", photo: `${dir}/G.Malgunde.png` },
  { name: "Mr. Prathamesh Dhapate", authority: "Member", designation: "Alumni Representative, Food Technology", photo: `${dir}/P.Dhapate.png` },
  { name: "Mrs. A. M. Mulla", authority: "Member", designation: "Department Alumni Coordinator, CSE", photo: `${dir}/A.M.Mulla.png` },
  { name: "Mr. R. P. Mali", authority: "Member", designation: "Department Alumni Coordinator, Mechanical", photo: `${dir}/R.P.Mali.png` },
  { name: "Mr. S. K. Shaikh", authority: "Member", designation: "Department Alumni Coordinator, Electrical", photo: `${dir}/S.K.Shaikh.png` },
  { name: "Mr. A. G. Mujawar", authority: "Member", designation: "Department Alumni Coordinator, Civil", photo: `${dir}/A.G.Mujawar.png` },
  { name: "Mr. Y. B. Kumbhar", authority: "Member", designation: "Department Alumni Coordinator, Aeronautical", photo: `${dir}/Y.B.Kumbhar.png` },
  { name: "Mr. Ashish Ashok Patil", authority: "Member", designation: "Department Alumni Coordinator, Food Technology", photo: `${dir}/A.A.Patil.png` },
  { name: "Mrs. S. P. Nalavade", authority: "Member", designation: "Department Alumni Coordinator, AI & DS", photo: `${dir}/S.P.Nalavade.png` },
  { name: "Mrs. P. S. Pathak", authority: "Member", designation: "Department Alumni Coordinator, CSE (IoT)", photo: `${dir}/P.S.Pathak.png` },
];

/** Initials used when a member has no photograph on file. */
export const initialsOf = (name: string) =>
  name
    .replace(/^(Adv\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
