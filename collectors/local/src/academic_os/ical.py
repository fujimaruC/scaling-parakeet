"""Conservative local ICS preview. Account-specific Moodle connection is unverified."""
from datetime import datetime
from zoneinfo import ZoneInfo
from .core import Invalid

def parse_ics(text):
    if len(text.encode())>5*1024*1024:raise Invalid('OVERSIZE')
    unfolded=text.replace('\r\n','\n').replace('\n ','').replace('\n\t','')
    events=[];current=None
    for line in unfolded.splitlines():
        if line=='BEGIN:VEVENT':current={'uid':None,'title':None,'due':{'precision':'unknown','local_date':None,'local_datetime':None,'timezone':None},'issues':[]}
        elif line=='END:VEVENT':
            if current is not None:
                if not current['uid']:current['issues'].append('missing_uid')
                events.append(current)
            current=None
        elif current is not None and ':' in line:
            name,value=line.split(':',1);key=name.split(';')[0]
            if key=='UID':current['uid']=value
            elif key=='SUMMARY':current['title']=value.replace('\\n','\n').replace('\\,',',')
            elif key in ('RRULE','RECURRENCE-ID'):current['issues'].append('recurrence_requires_review')
            elif key in ('DTSTART','DUE'):
                if ';VALUE=DATE' in name:
                    try:date=datetime.strptime(value,'%Y%m%d').date().isoformat()
                    except ValueError:current['issues'].append('invalid_date');continue
                    # All-day dates retain their precision; timezone selection is explicitly required.
                    current['due']={'precision':'date_only','local_date':date,'local_datetime':None,'timezone':None};current['issues'].append('timezone_requires_review')
                else:
                    try:
                        if value.endswith('Z'):dt=datetime.strptime(value,'%Y%m%dT%H%M%SZ');zone='UTC'
                        elif ';TZID=' in name:zone=name.split(';TZID=',1)[1].split(';')[0];ZoneInfo(zone);dt=datetime.strptime(value,'%Y%m%dT%H%M%S')
                        else:current['issues'].append('floating_time_requires_review');continue
                        current['due']={'precision':'datetime','local_date':None,'local_datetime':dt.isoformat(),'timezone':zone}
                    except (ValueError,KeyError):current['issues'].append('invalid_date')
    return events
